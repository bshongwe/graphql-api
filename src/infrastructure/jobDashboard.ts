import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { queues } from './jobQueue.js';
import { logger } from './logger.js';

/**
 * Bull Board dashboard configuration
 */
export function createJobDashboard() {
  try {
    // Create Express adapter for Bull Board
    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath('/admin/queues');

    // Create Bull Board with all queues
    const { addQueue, removeQueue, setQueues, replaceQueues } = createBullBoard(
      {
        queues: [
          new BullMQAdapter(queues.emailQueue),
          new BullMQAdapter(queues.userProcessingQueue),
          new BullMQAdapter(queues.notificationsQueue),
          new BullMQAdapter(queues.dataExportQueue),
        ],
        serverAdapter,
      }
    );

    logger.info('Bull Board dashboard created successfully');

    return {
      router: serverAdapter.getRouter(),
      addQueue,
      removeQueue,
      setQueues,
      replaceQueues,
    };
  } catch (error) {
    logger.error(error, 'Failed to create Bull Board dashboard');
    throw error;
  }
}

/**
 * Dashboard middleware for authentication
 * In production, implement proper authentication
 */
export function dashboardAuthMiddleware() {
  return (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;

    // Simple token check - replace with proper auth in production
    if (process.env.NODE_ENV === 'production') {
      if (
        !authHeader ||
        authHeader !== `Bearer ${process.env.DASHBOARD_TOKEN}`
      ) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }

    // In development, allow all access
    logger.info(
      {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
      },
      'Dashboard access'
    );

    next();
  };
}
