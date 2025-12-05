import { Queue, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import { logger } from './logger.js';

/**
 * Redis connection configuration for BullMQ
 */
const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number.parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
  db: Number.parseInt(process.env.REDIS_DB || '1', 10), // Use DB 1 for jobs (DB 0 for PubSub)
  maxRetriesPerRequest: null, // Required by BullMQ
  retryDelayOnFailover: 100,
  enableOfflineQueue: false,
};

/**
 * Redis client for BullMQ
 */
export const redis = new IORedis(redisConnection);

/**
 * Job queue definitions
 */
export const JOB_QUEUES = {
  EMAIL: 'email-queue',
  USER_PROCESSING: 'user-processing-queue',
  NOTIFICATIONS: 'notifications-queue',
  DATA_EXPORT: 'data-export-queue',
} as const;

/**
 * Job types
 */
export const JOB_TYPES = {
  SEND_WELCOME_EMAIL: 'send-welcome-email',
  SEND_PASSWORD_RESET: 'send-password-reset',
  PROCESS_USER_SIGNUP: 'process-user-signup',
  PROCESS_USER_DELETION: 'process-user-deletion',
  SEND_NOTIFICATION: 'send-notification',
  EXPORT_USER_DATA: 'export-user-data',
  CLEANUP_EXPIRED_TOKENS: 'cleanup-expired-tokens',
} as const;

/**
 * Initialize job queues
 */
export const queues = {
  emailQueue: new Queue(JOB_QUEUES.EMAIL, { connection: redis }),
  userProcessingQueue: new Queue(JOB_QUEUES.USER_PROCESSING, { connection: redis }),
  notificationsQueue: new Queue(JOB_QUEUES.NOTIFICATIONS, { connection: redis }),
  dataExportQueue: new Queue(JOB_QUEUES.DATA_EXPORT, { connection: redis }),
};

/**
 * Queue events for monitoring
 */
export const queueEvents = {
  emailEvents: new QueueEvents(JOB_QUEUES.EMAIL, { connection: redis }),
  userProcessingEvents: new QueueEvents(JOB_QUEUES.USER_PROCESSING, { connection: redis }),
  notificationsEvents: new QueueEvents(JOB_QUEUES.NOTIFICATIONS, { connection: redis }),
  dataExportEvents: new QueueEvents(JOB_QUEUES.DATA_EXPORT, { connection: redis }),
};

/**
 * Job data interfaces
 */
export interface EmailJobData {
  type: typeof JOB_TYPES.SEND_WELCOME_EMAIL | typeof JOB_TYPES.SEND_PASSWORD_RESET;
  to: string;
  subject: string;
  template: string;
  variables: Record<string, any>;
}

export interface UserJobData {
  type: typeof JOB_TYPES.PROCESS_USER_SIGNUP | typeof JOB_TYPES.PROCESS_USER_DELETION;
  userId: string;
  email: string;
  metadata?: Record<string, any>;
}

export interface NotificationJobData {
  type: typeof JOB_TYPES.SEND_NOTIFICATION;
  userId: string;
  title: string;
  message: string;
  channel: 'email' | 'push' | 'sms';
}

export interface DataExportJobData {
  type: typeof JOB_TYPES.EXPORT_USER_DATA | typeof JOB_TYPES.CLEANUP_EXPIRED_TOKENS;
  userId?: string;
  format?: 'json' | 'csv' | 'pdf';
  filters?: Record<string, any>;
}

/**
 * Job utilities class
 */
export class JobService {
  /**
   * Add email job to queue
   */
  static async addEmailJob(data: EmailJobData, options: any = {}) {
    try {
      const job = await queues.emailQueue.add(data.type, data, {
        delay: options.delay || 0,
        attempts: options.attempts || 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 10,
        removeOnFail: 5,
        ...options,
      });

      logger.info({ jobId: job.id, type: data.type }, 'Email job added to queue');
      return job;
    } catch (error) {
      logger.error(error, 'Failed to add email job to queue');
      throw error;
    }
  }

  /**
   * Add user processing job to queue
   */
  static async addUserJob(data: UserJobData, options: any = {}) {
    try {
      const job = await queues.userProcessingQueue.add(data.type, data, {
        attempts: options.attempts || 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 20,
        removeOnFail: 10,
        ...options,
      });

      logger.info({ jobId: job.id, type: data.type, userId: data.userId }, 'User processing job added to queue');
      return job;
    } catch (error) {
      logger.error(error, 'Failed to add user processing job to queue');
      throw error;
    }
  }

  /**
   * Add notification job to queue
   */
  static async addNotificationJob(data: NotificationJobData, options: any = {}) {
    try {
      const job = await queues.notificationsQueue.add(data.type, data, {
        attempts: options.attempts || 5,
        backoff: {
          type: 'exponential',
          delay: 1500,
        },
        removeOnComplete: 15,
        removeOnFail: 8,
        ...options,
      });

      logger.info({ jobId: job.id, userId: data.userId, channel: data.channel }, 'Notification job added to queue');
      return job;
    } catch (error) {
      logger.error(error, 'Failed to add notification job to queue');
      throw error;
    }
  }

  /**
   * Add data export job to queue
   */
  static async addDataExportJob(data: DataExportJobData, options: any = {}) {
    try {
      const job = await queues.dataExportQueue.add(data.type, data, {
        attempts: options.attempts || 2,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: 5,
        removeOnFail: 3,
        ...options,
      });

      logger.info({ jobId: job.id, type: data.type }, 'Data export job added to queue');
      return job;
    } catch (error) {
      logger.error(error, 'Failed to add data export job to queue');
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  static async getQueueStats() {
    try {
      const stats: Record<string, any> = {};
      
      for (const [name, queue] of Object.entries(queues)) {
        const [waiting, active, completed, failed, delayed] = await Promise.all([
          queue.getWaiting(),
          queue.getActive(),
          queue.getCompleted(),
          queue.getFailed(),
          queue.getDelayed(),
        ]);

        stats[name] = {
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length,
          delayed: delayed.length,
        };
      }

      return stats;
    } catch (error) {
      logger.error(error, 'Failed to get queue statistics');
      return {};
    }
  }

  /**
   * Clean up completed and failed jobs
   */
  static async cleanupQueues() {
    try {
      const results = [];
      
      for (const [name, queue] of Object.entries(queues)) {
        const [cleanedCompleted, cleanedFailed] = await Promise.all([
          queue.clean(24 * 60 * 60 * 1000, 50, 'completed'), // Clean completed jobs older than 1 day
          queue.clean(7 * 24 * 60 * 60 * 1000, 20, 'failed'), // Clean failed jobs older than 7 days
        ]);
        
        results.push({ queue: name, cleanedCompleted, cleanedFailed });
      }

      logger.info({ results }, 'Queue cleanup completed');
      return results;
    } catch (error) {
      logger.error(error, 'Failed to cleanup queues');
      throw error;
    }
  }
}

/**
 * Initialize job queues and setup error handling
 */
export async function initializeJobQueues(): Promise<void> {
  try {
    // Test Redis connection
    await redis.ping();
    logger.info('Redis connection established for job queues');

    // Setup queue event listeners
    for (const [name, events] of Object.entries(queueEvents)) {
      events.on('completed', ({ jobId, returnvalue }) => {
        logger.info({ jobId, returnvalue, queue: name }, 'Job completed');
      });

      events.on('failed', ({ jobId, failedReason }) => {
        logger.error({ jobId, failedReason, queue: name }, 'Job failed');
      });

      events.on('progress', ({ jobId, data }) => {
        logger.debug({ jobId, progress: data, queue: name }, 'Job progress update');
      });

      events.on('stalled', ({ jobId }) => {
        logger.warn({ jobId, queue: name }, 'Job stalled');
      });
    }

    logger.info('Job queues initialized successfully');
  } catch (error) {
    logger.error(error, 'Failed to initialize job queues');
    throw error;
  }
}

/**
 * Close all job queues and connections
 */
export async function closeJobQueues(): Promise<void> {
  try {
    // Close all queues
    await Promise.all(Object.values(queues).map(queue => queue.close()));
    
    // Close all queue events
    await Promise.all(Object.values(queueEvents).map(events => events.close()));
    
    // Close Redis connection
    await redis.quit();
    
    logger.info('Job queues closed successfully');
  } catch (error) {
    logger.error(error, 'Error closing job queues');
    throw error;
  }
}
