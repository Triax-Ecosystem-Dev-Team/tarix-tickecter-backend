const bcrypt = require('bcrypt');
const prisma = require('../config/db');
const { generateToken } = require('../utils/generateToken');
const { sendResponse } = require('../utils/responseFormatter');
const { sendWelcomeEmail} = require('../utils/mail');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return sendResponse(res, 400, null, 'Please provide all required fields');
    }

    const userExists = await prisma.user.findUnique({
      where: { email },
    });

    if (userExists) {
      return sendResponse(res, 400, null, 'User already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || 'Passenger',
      },
    });

    if (user) {
      sendResponse(res, 201, {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user.id),
      }, 'User registered successfully');
    } else {
      sendResponse(res, 400, null, 'Invalid user data');
    }
  } catch (error) {
    next(error);
  }
};

//@desc Register Passenger
//@route POST /api/auth/passenger
//@access Public

const createPassenger = async (req, res, next) => {
  try {
    const { 
      title, surname, firstname, dateOfBirth, occupation, state, 
      localGovernment, nationality, address, phone, officePhone, 
      email, nextOfKinName, nextOfKinPhone, nextOfKinAddress, 
      nextOfKinRelationship 
    } = req.body;

    // 1. Validate input
    if (!title || !surname || !firstname || !dateOfBirth || !occupation || !state || !localGovernment || !nationality || !address || !phone || !email || !nextOfKinName || !nextOfKinPhone || !nextOfKinAddress || !nextOfKinRelationship) {
      return sendResponse(res, 400, null, 'Please provide all fields');
    }

    // 2. Format the Date and generate LoginId
    const dob = new Date(dateOfBirth);
    if (isNaN(dob.getTime())) {
      return sendResponse(res, 400, null, 'Invalid Date of Birth format');
    }

    // Extract day, month (0-indexed so we add 1), and year. Pad single digits with '0'.
    const day = String(dob.getDate()).padStart(2, '0');
    const month = String(dob.getMonth() + 1).padStart(2, '0'); 
    const year = dob.getFullYear();
    
    // Remove potential spaces from the surname and uppercase it for a cleaner ID
    const cleanSurname = surname.replace(/\s+/g, '').toUpperCase();
    const loginId = `${cleanSurname}${day}${month}${year}`;

    // 3. Check if a passenger with this loginId already exists
    const passengerExists = await prisma.passenger.findUnique({
      where: { loginId },
    });

    if (passengerExists) {
      return sendResponse(res, 400, null, 'A passenger with this Surname and Date of Birth already exists.');
    }

    // 4. Create the new passenger
    const newPassenger = await prisma.passenger.create({
      data: {
        loginId,
        title,
        surname,
        firstname,
        dateOfBirth: dob.toISOString(), 
        occupation,
        state,
        localGovernment,
        nationality,
        address,
        phone,
        officePhone,
        email,
        nextOfKinName,
        nextOfKinPhone,
        nextOfKinAddress,
        nextOfKinRelationship
      }
    });

    // 5. Send Welcome Email
    // await sendWelcomeEmail(email, firstname, loginId);

    // 6. Return success response
    return sendResponse(res, 201, newPassenger, 'Passenger registered successfully');

  } catch (error) {
    next(error);
  }
};











// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Fetch user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // 2. Strict null check to prevent email enumeration
    if (!user) {
      return sendResponse(res, 401, null, 'Invalid email or password');
    }

    // 3. Verify password only after confirming user exists
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return sendResponse(res, 401, null, 'Invalid email or password');
    }

    // 4. Return success response
    return sendResponse(res, 200, {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      token: generateToken(user.id),
    }, 'Login successful');

  } catch (error) {
    // 5. Log detailed error to console, return generic 500 to client
    console.error('Fatal Login Error:', error);
    return sendResponse(res, 500, null, 'An internal server error occurred');
  }
};

// @desc    Get user profile
// @route   GET /api/users/me
// @access  Private
const getUserProfile = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
      },
    });

    if (user) {
      sendResponse(res, 200, user, 'User profile fetched successfully');
    } else {
      sendResponse(res, 404, null, 'User not found');
    }
  } catch (error) {
    next(error);
  }
};

//@desc Get Passenger by LoginId
//@route GET /api/auth/passenger/:loginId
//@access Public
const getPassengerByLoginId = async (req, res, next) => {
  try {
    const { loginId } = req.params;

    const passenger = await prisma.passenger.findUnique({
      where: { loginId: loginId.toUpperCase() },
    });

    if (!passenger) {
      return sendResponse(res, 200, { exists: false }, 'Passenger not found');
    }

    sendResponse(res, 200, { ...passenger, exists: true }, 'Passenger details fetched successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  createPassenger,
  getPassengerByLoginId
};
