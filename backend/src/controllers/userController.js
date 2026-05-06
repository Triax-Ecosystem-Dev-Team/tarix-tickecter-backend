const bcrypt = require('bcrypt');
const prisma = require('../config/db');
const { sendResponse } = require('../utils/responseFormatter');

// @desc    Update user profile
// @route   PATCH /api/users/profile
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const { name, phone } = req.body;
    let { avatar } = req.body;
    const userId = req.user.id;

    // Handle file upload if present
    if (req.file) {
      const { uploadToSupabase } = require('../utils/supabaseStorage');
      avatar = await uploadToSupabase(req.file.buffer, req.file.originalname, req.file.mimetype, 'profiles');
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { 
        name, 
        phone, 
        ...(avatar !== undefined && { avatar })
      },
      select: {
        id: true, name: true, email: true, role: true,
        phone: true, avatar: true, twoFaEnabled: true,
        theme: true, notifEmail: true, notifSms: true, notifPush: true,
      }
    });

    sendResponse(res, 200, updatedUser, 'Profile updated successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Change password
// @route   PATCH /api/users/security/password
// @access  Private
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return sendResponse(res, 400, null, 'Current and new password are required');
    }

    if (newPassword.length < 8) {
      return sendResponse(res, 400, null, 'New password must be at least 8 characters');
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return sendResponse(res, 404, null, 'User not found');

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return sendResponse(res, 401, null, 'Current password is incorrect');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    sendResponse(res, 200, null, 'Password changed successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle 2FA
// @route   PATCH /api/users/security/2fa
// @access  Private
const toggle2FA = async (req, res, next) => {
  try {
    const { enabled } = req.body;
    const userId = req.user.id;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { twoFaEnabled: enabled },
      select: {
        id: true, name: true, email: true, role: true,
        phone: true, avatar: true, twoFaEnabled: true,
        theme: true, notifEmail: true, notifSms: true, notifPush: true,
      }
    });

    sendResponse(res, 200, updatedUser, `Two-Factor Authentication ${enabled ? 'enabled' : 'disabled'}`);
  } catch (error) {
    next(error);
  }
};

// @desc    Update preferences (theme + notifications)
// @route   PATCH /api/users/preferences
// @access  Private
const updatePreferences = async (req, res, next) => {
  try {
    const { theme, notifEmail, notifSms, notifPush } = req.body;
    const userId = req.user.id;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(theme !== undefined && { theme }),
        ...(notifEmail !== undefined && { notifEmail }),
        ...(notifSms !== undefined && { notifSms }),
        ...(notifPush !== undefined && { notifPush }),
      },
      select: {
        id: true, name: true, email: true, role: true,
        phone: true, avatar: true, twoFaEnabled: true,
        theme: true, notifEmail: true, notifSms: true, notifPush: true,
      }
    });

    sendResponse(res, 200, updatedUser, 'Preferences updated');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  updateProfile,
  changePassword,
  toggle2FA,
  updatePreferences,
};
