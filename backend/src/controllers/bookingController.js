const prisma = require('../config/db');
const { sendResponse } = require('../utils/responseFormatter');

// ─── Constants ─────────────────────────────────────────────────────────────────
// This is the platform service fee applied to every booking.
// Centralising it here makes it trivial to update or move to SystemSettings later.
const SERVICE_FEE = 500;

// ─── Helper: Backend Price Calculator ──────────────────────────────────────────
/**
 * Calculates the authoritative total price entirely on the backend.
 * This is the ONLY source of truth — the frontend's totalPrice is never trusted.
 *
 * Formula: (seatCount × tripBasePrice) + (extraBaggage × baggagePrice) + SERVICE_FEE
 *
 * @param {number} seatCount      - Number of seats being booked
 * @param {number} tripBasePrice  - Per-seat base price from Trip/BusModel
 * @param {number} extraBaggage   - Number of extra baggage units
 * @param {number} baggagePrice   - Price per baggage unit from SystemSettings
 * @returns {{ seatsCost: number, baggageCost: number, serviceFee: number, total: number }}
 */
function calculateAuthoritative(seatCount, tripBasePrice, extraBaggage, baggagePrice) {
  const seatsCost   = seatCount * tripBasePrice;
  const baggageCost = extraBaggage * baggagePrice;
  const serviceFee  = SERVICE_FEE;
  const total       = seatsCost + baggageCost + serviceFee;
  return { seatsCost, baggageCost, serviceFee, total };
}

// ─── Mock Payment Gateway ───────────────────────────────────────────────────────
/**
 * Simulates payment processing. In production, this function body will be replaced
 * with a real Paystack/Stripe SDK call that returns a checkout URL and reference.
 *
 * @param {'cash'|'card'|'transfer'} method
 * @param {number} amount
 * @returns {{ paymentStatus: string, paymentReference: string|null, checkoutUrl: string|null }}
 */
function processMockPayment(method, amount) {
  if (method === 'cash') {
    // Cash: mock an instant wallet deduction — booking is immediately PAID.
    const reference = `CASH-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    return {
      paymentStatus: 'completed',
      paymentReference: reference,
      checkoutUrl: null,
    };
  }

  // card / transfer: booking stays PENDING until the gateway webhook confirms payment.
  // In production: call Paystack's /transaction/initialize here and return the
  // authorization_url as `checkoutUrl`. For now we return a null placeholder.
  return {
    paymentStatus: 'pending',
    paymentReference: null,  // Will be set by the gateway webhook handler
    checkoutUrl: null,        // TODO: return Paystack/Stripe checkout URL here
  };
}

// ─── Controller: Create Booking ─────────────────────────────────────────────────
// @desc    Create a booking with backend-verified pricing and mock gateway
// @route   POST /api/bookings
// @access  Private
const createBooking = async (req, res, next) => {
  try {
    const {
      tripId,
      passengerId,
      requestedSeats,       // string[] — specific seat IDs the passenger wants
      hasExtraBaggage,
      extraBaggage,
      paymentMethod,
      totalPrice: clientTotalPrice, // ⚠️  Received but NEVER trusted for calculation
    } = req.body;
    
    // ── Input Guard ────────────────────────────────────────────────────────────
    if (!tripId || !passengerId) {
      return sendResponse(res, 400, null, 'Please provide tripId and passengerId');
    }

    const validPaymentMethods = ['cash', 'card', 'transfer'];
    if (paymentMethod && !validPaymentMethods.includes(paymentMethod)) {
      return sendResponse(res, 400, null, `Invalid paymentMethod. Must be one of: ${validPaymentMethods.join(', ')}`);
    }

    // Normalise seat data — fall back to a seat-count-only booking if no IDs provided
    const seatIds   = Array.isArray(requestedSeats) ? requestedSeats : [];
    const seatCount = seatIds.length > 0 ? seatIds.length : 1;
    const baggage   = parseInt(extraBaggage, 10) || 0;
 
    

    // ─── ACID $transaction ──────────────────────────────────────────────────────
    // Prisma serializable isolation prevents phantom reads between SELECT and INSERT,
    // giving us full double-booking protection at the database level.
    const { booking, paymentResult } = await prisma.$transaction(async (tx) => {

      // ── Step 1: Fetch the Trip (with BusModel) ─────────────────────────────
      const trip = await tx.trip.findUnique({
        where: { id: tripId },
        include: { busModel: true },
      });

      if (!trip) {
        const err = new Error('Trip not found');
        err.statusCode = 404;
        throw err;
      }
      
      if (trip.availableSeats < seatCount) {
        const err = new Error('Not enough seats available on this trip');
        err.statusCode = 400;
        throw err;
      }

      // ── Step 2: Seat-Level Conflict Check ─────────────────────────────────
      if (seatIds.length > 0) {
        const existingBookings = await tx.booking.findMany({
          where: { tripId, status: { not: 'cancelled' } },
          select: { bookedSeats: true },
        });

        const alreadyBooked = new Set(existingBookings.flatMap((b) => b.bookedSeats));
        const conflicting   = seatIds.filter((id) => alreadyBooked.has(id));

        if (conflicting.length > 0) {
          const err = new Error(
            `Seat conflict: ${conflicting.join(', ')} ${conflicting.length === 1 ? 'is' : 'are'} already booked`
          );
          err.statusCode = 409; // HTTP 409 Conflict
          throw err;
        }
      }

      // ── Step 3: Fetch System Settings (baggage price) ──────────────────────
      // We fetch this INSIDE the transaction for consistency; SystemSettings
      // should rarely change, but this protects against a race during updates.
      let settings = await tx.systemSettings.findFirst();
      if (!settings) {
        // Bootstrap default settings if the table is empty
        settings = await tx.systemSettings.create({
          data: { extraBaggagePrice: 2500 },
        });
      }

      // ── Step 4: Authoritative Backend Price Calculation ────────────────────
      // The base price comes from the BusModel if assigned, else the Trip's own price.
      const tripBasePrice = trip.busModel?.basePrice ?? trip.price;
      const baggagePrice  = settings.extraBaggagePrice;

      const { seatsCost, baggageCost, serviceFee, total: authoritative } =
        calculateAuthoritative(seatCount, tripBasePrice, hasExtraBaggage ? baggage : 0, baggagePrice);

      // ── Step 5: Price Validation ───────────────────────────────────────────
      // If the frontend sent a price AND it doesn't match, reject the request.
      // A ±1 tolerance handles floating-point rounding across JS environments.
      if (clientTotalPrice !== undefined && clientTotalPrice !== null) {
        const diff = Math.abs(parseFloat(clientTotalPrice) - authoritative);
        if (diff > 1) {
          const err = new Error(
            `Price validation failed. Expected ₦${authoritative.toLocaleString()}, ` +
            `received ₦${parseFloat(clientTotalPrice).toLocaleString()}. ` +
            `Please refresh and try again.`
          );
          err.statusCode = 400;
          throw err;
        }
      }

      // ── Step 6: Resolve Ticketer Identity ─────────────────────────────────
      let ticketerId = null;
      if (req.user?.role === 'Ticketer') {
        const ticketer = await tx.ticketer.findUnique({
          where: { userId: req.user.id },
        });
        ticketerId = ticketer?.id ?? null;
      }

      // ── Step 7: Mock Payment Gateway ──────────────────────────────────────
      // Determines the payment outcome without calling a real external service.
      // Replace this section with Paystack/Stripe SDK calls in production.
      const gatewayResult = paymentMethod
        ? processMockPayment(paymentMethod, authoritative)
        : { paymentStatus: 'pending', paymentReference: null, checkoutUrl: null };

      // ── Step 8: Create the Booking ────────────────────────────────────────
      const newBooking = await tx.booking.create({
        data: {
          tripId,
          PassengerId:      passengerId,
          ticketerId,
          seats:            seatCount,
          bookedSeats:      seatIds,
          totalPrice:       authoritative,          // ✅ Always the backend-calculated value
          hasExtraBaggage:  hasExtraBaggage || false,
          extraBaggage:     baggage,
          baggageFee:       baggageCost,
          paymentMethod:    paymentMethod || null,
          paymentStatus:    gatewayResult.paymentStatus,   // ✅ Determined by gateway, not client
          paymentReference: gatewayResult.paymentReference,
          status:           gatewayResult.paymentStatus === 'completed' ? 'confirmed' : 'pending',
        },
        include: {
          passenger: true,
          trip: { include: { busModel: true } },
        },
      });

      // ── Step 9: Create Payment Audit Record ───────────────────────────────
      // The Payment model maintains a full audit trail of every payment attempt.
      if (paymentMethod) {
        await tx.payment.create({
          data: {
            bookingId: newBooking.id,
            amount:    authoritative,
            method:    paymentMethod,
            status:    gatewayResult.paymentStatus,
            reference: gatewayResult.paymentReference,
          },
        });
      }

      // ── Step 10: Atomically Decrement Available Seats ─────────────────────
      await tx.trip.update({
        where: { id: tripId },
        data: { availableSeats: { decrement: seatCount } },
      });

      return { booking: newBooking, paymentResult: gatewayResult };
    }); // ─── End $transaction ──────────────────────────────────────────────────

    // ── Build the response payload ─────────────────────────────────────────────
    // Attach a checkoutUrl for card/transfer so the frontend can redirect when
    // a real gateway is wired up. Currently null — kept here for API contract stability.
    const responsePayload = {
      ...booking,
      _gateway: {
        checkoutUrl:  paymentResult.checkoutUrl,  // Future: Paystack authorization_url
        isPending:    paymentResult.paymentStatus === 'pending',
        message: paymentResult.paymentStatus === 'completed'
          ? 'Payment processed successfully. Booking confirmed.'
          : 'Booking created in PENDING state. Awaiting payment confirmation.',
      },
    };

    sendResponse(res, 201, responsePayload, 'Booking created successfully');
  } catch (error) {
    if (error.statusCode) {
      return sendResponse(res, error.statusCode, null, error.message);
    }
    next(error);
  }
};


// ─── Controller: Get All Bookings ──────────────────────────────────────────────
// @desc    Get all bookings
// @route   GET /api/bookings
// @access  Private/Admin/Ticketer
const getBookings = async (req, res, next) => {
  try {
    const bookings = await prisma.booking.findMany({
      include: {
        trip: true,
        passenger: true,
        ticketer: {
          include: { user: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    sendResponse(res, 200, bookings, 'Bookings fetched successfully');
  } catch (error) {
    next(error);
  }
};

// ─── Controller: Omni-Search Bookings ──────────────────────────────────────────
// @desc    Search bookings by reference, ID, passenger loginId, or passenger phone
// @route   GET /api/bookings/search?q=...
// @access  Private
const searchBookings = async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q) {
      return sendResponse(res, 400, null, 'Search query is required');
    }

    const bookings = await prisma.booking.findMany({
      where: {
        OR: [
          { paymentReference: { equals: q, mode: 'insensitive' } },
          { id: { equals: q, mode: 'insensitive' } },
          {
            passenger: {
              OR: [
                { loginId: { equals: q, mode: 'insensitive' } },
                { phone: { equals: q, mode: 'insensitive' } }
              ]
            }
          }
        ]
      },
      include: {
        trip: {
          include: { busModel: true, bus: { include: { busModel: true } } }
        },
        passenger: true,
        ticketer: {
          include: { user: { select: { name: true, email: true } } },
        },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    sendResponse(res, 200, bookings, 'Search completed successfully');
  } catch (error) {
    next(error);
  }
};

// ─── Controller: Get Booking By Reference or ID ─────────────────────────────────
// @desc    Get booking by reference or ID
// @route   GET /api/bookings/:reference
// @access  Private
const getBookingByReference = async (req, res, next) => {
  try {
    const { reference } = req.params;

    const booking = await prisma.booking.findFirst({
      where: { 
        OR: [
          { id: reference },
          { paymentReference: reference }
        ]
      },
      include: {
        trip: {
          include: { busModel: true, bus: { include: { busModel: true } } }
        },
        passenger: true,
        ticketer: {
          include: { user: { select: { name: true, email: true } } },
        },
        payments: true,  // Include full payment audit trail
      },
    });

    if (!booking) {
      return sendResponse(res, 404, null, 'Booking not found');
    }

    sendResponse(res, 200, booking, 'Booking fetched successfully');
  } catch (error) {
    next(error);
  }
};

// ─── Controller: Update Booking Status ─────────────────────────────────────────
// @desc    Update booking status
// @route   PATCH /api/bookings/:id/status
// @access  Private/Admin/Ticketer
const updateBookingStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    const validStatuses = ['pending', 'confirmed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return sendResponse(res, 400, null, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
    });

    if (!booking) {
      return sendResponse(res, 404, null, 'Booking not found');
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: req.params.id },
      data: { status },
    });

    // Restore available seats atomically when a booking is cancelled
    if (status === 'cancelled' && booking.status !== 'cancelled') {
      await prisma.trip.update({
        where: { id: booking.tripId },
        data: { availableSeats: { increment: booking.seats } },
      });
    }

    sendResponse(res, 200, updatedBooking, 'Booking status updated successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBooking,
  getBookings,
  getBookingByReference,
  searchBookings,
  updateBookingStatus,
};
