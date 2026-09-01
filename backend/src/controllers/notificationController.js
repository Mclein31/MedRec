const notificationModel = require('../models/notificationModel');

async function getNotifications(req, res, next) {
  try {
    const { limit, offset } = req.query;
    const [notifications, unreadCount] = await Promise.all([
      notificationModel.getAllForUser(req.user.id, { limit, offset }),
      notificationModel.getUnreadCount(req.user.id),
    ]);
    res.json({ notifications, unreadCount });
  } catch (err) {
    next(err);
  }
}

async function markRead(req, res, next) {
  try {
    const { id } = req.params;
    const notification = await notificationModel.markAsRead(req.user.id, id);
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    const unreadCount = await notificationModel.getUnreadCount(req.user.id);
    res.json({ success: true, notification, unreadCount });
  } catch (err) {
    next(err);
  }
}

async function markAllRead(req, res, next) {
  try {
    const updatedCount = await notificationModel.markAllAsRead(req.user.id);
    res.json({ success: true, updatedCount, unreadCount: 0 });
  } catch (err) {
    next(err);
  }
}

async function deleteNotification(req, res, next) {
  try {
    const { id } = req.params;
    const deleted = await notificationModel.deleteForUser(req.user.id, id);
    if (!deleted) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getNotifications,
  markRead,
  markAllRead,
  deleteNotification,
};
