import { Worker, Job } from 'bullmq';
import { redisConnectionConfig, JOB_QUEUES, JOB_TYPES } from './jobQueue.js';
import { logger } from './logger.js';
import type {
  EmailJobData,
  UserJobData,
  NotificationJobData,
  DataExportJobData,
} from './jobQueue.js';

/**
 * Email job processor
 */
async function processEmailJob(job: Job<EmailJobData>) {
  const { type, to, subject } = job.data;

  logger.info({ jobId: job.id, type, to, subject }, 'Processing email job');

  try {
    // Simulate email processing - API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    switch (type) {
      case JOB_TYPES.SEND_WELCOME_EMAIL:
        logger.info({ jobId: job.id, to }, 'Welcome email sent successfully');
        break;
      case JOB_TYPES.SEND_PASSWORD_RESET:
        logger.info(
          { jobId: job.id, to },
          'Password reset email sent successfully'
        );
        break;
      default:
        logger.warn({ jobId: job.id, type }, 'Unknown email job type');
    }

    // Update job progress
    await job.updateProgress(100);

    return { success: true, sentAt: new Date().toISOString() };
  } catch (error) {
    logger.error({ jobId: job.id, error }, 'Email job failed');
    throw error;
  }
}

/**
 * User processing job processor
 */
async function processUserJob(job: Job<UserJobData>) {
  const { type, userId } = job.data;

  logger.info({ jobId: job.id, type, userId }, 'Processing user job');

  try {
    // Update progress
    await job.updateProgress(25);

    switch (type) {
      case JOB_TYPES.PROCESS_USER_SIGNUP:
        // Simulate user onboarding tasks
        await new Promise(resolve => setTimeout(resolve, 500));
        await job.updateProgress(50);

        // Create user profile data
        await new Promise(resolve => setTimeout(resolve, 300));
        await job.updateProgress(75);

        // Send welcome notifications
        await new Promise(resolve => setTimeout(resolve, 200));
        await job.updateProgress(100);

        logger.info(
          { jobId: job.id, userId },
          'User signup processing completed'
        );
        break;

      case JOB_TYPES.PROCESS_USER_DELETION:
        // Simulate cleanup tasks
        await new Promise(resolve => setTimeout(resolve, 800));
        await job.updateProgress(50);

        // Archive user data
        await new Promise(resolve => setTimeout(resolve, 600));
        await job.updateProgress(75);

        // Send deletion confirmation
        await new Promise(resolve => setTimeout(resolve, 200));
        await job.updateProgress(100);

        logger.info(
          { jobId: job.id, userId },
          'User deletion processing completed'
        );
        break;

      default:
        logger.warn({ jobId: job.id, type }, 'Unknown user job type');
    }

    return { success: true, processedAt: new Date().toISOString() };
  } catch (error) {
    logger.error({ jobId: job.id, error }, 'User job failed');
    throw error;
  }
}

/**
 * Notification job processor
 */
async function processNotificationJob(job: Job<NotificationJobData>) {
  const { userId, title, channel } = job.data;

  logger.info(
    { jobId: job.id, userId, channel, title },
    'Processing notification job'
  );

  try {
    await job.updateProgress(25);

    // Simulate notification delivery based on channel
    switch (channel) {
      case 'email':
        await new Promise(resolve => setTimeout(resolve, 800));
        break;
      case 'push':
        await new Promise(resolve => setTimeout(resolve, 300));
        break;
      case 'sms':
        await new Promise(resolve => setTimeout(resolve, 600));
        break;
    }

    await job.updateProgress(75);

    // Log delivery
    await new Promise(resolve => setTimeout(resolve, 100));
    await job.updateProgress(100);

    logger.info(
      { jobId: job.id, userId, channel },
      'Notification sent successfully'
    );

    return {
      success: true,
      channel,
      deliveredAt: new Date().toISOString(),
    };
  } catch (error) {
    logger.error({ jobId: job.id, error }, 'Notification job failed');
    throw error;
  }
}

/**
 * Data export job processor
 */
async function processDataExportJob(job: Job<DataExportJobData>) {
  const { type, userId, format } = job.data;

  logger.info(
    { jobId: job.id, type, userId, format },
    'Processing data export job'
  );

  try {
    await job.updateProgress(10);

    switch (type) {
      case JOB_TYPES.EXPORT_USER_DATA:
        // Simulate data collection
        await new Promise(resolve => setTimeout(resolve, 1000));
        await job.updateProgress(40);

        // Simulate data formatting
        await new Promise(resolve => setTimeout(resolve, 800));
        await job.updateProgress(70);

        // Simulate file generation
        await new Promise(resolve => setTimeout(resolve, 500));
        await job.updateProgress(90);

        // Simulate file upload/storage
        await new Promise(resolve => setTimeout(resolve, 300));
        await job.updateProgress(100);

        logger.info(
          { jobId: job.id, userId, format },
          'User data export completed'
        );
        break;

      case JOB_TYPES.CLEANUP_EXPIRED_TOKENS:
        // Simulate cleanup operations
        await new Promise(resolve => setTimeout(resolve, 1500));
        await job.updateProgress(50);

        await new Promise(resolve => setTimeout(resolve, 800));
        await job.updateProgress(100);

        logger.info({ jobId: job.id }, 'Token cleanup completed');
        break;

      default:
        logger.warn({ jobId: job.id, type }, 'Unknown data export job type');
    }

    return {
      success: true,
      completedAt: new Date().toISOString(),
      recordsProcessed: Math.floor(Math.random() * 1000) + 100,
    };
  } catch (error) {
    logger.error({ jobId: job.id, error }, 'Data export job failed');
    throw error;
  }
}

/**
 * Initialize job workers
 */
export const workers = {
  emailWorker: new Worker(JOB_QUEUES.EMAIL, processEmailJob, {
    connection: redisConnectionConfig,
    concurrency: 5,
    limiter: {
      max: 10,
      duration: 60000, // 10 jobs per minute
    },
  }),

  userProcessingWorker: new Worker(JOB_QUEUES.USER_PROCESSING, processUserJob, {
    connection: redisConnectionConfig,
    concurrency: 3,
    limiter: {
      max: 20,
      duration: 60000, // 20 jobs per minute
    },
  }),

  notificationsWorker: new Worker(
    JOB_QUEUES.NOTIFICATIONS,
    processNotificationJob,
    {
      connection: redisConnectionConfig,
      concurrency: 8,
      limiter: {
        max: 50,
        duration: 60000, // 50 jobs per minute
      },
    }
  ),

  dataExportWorker: new Worker(JOB_QUEUES.DATA_EXPORT, processDataExportJob, {
    connection: redisConnectionConfig,
    concurrency: 2,
    limiter: {
      max: 5,
      duration: 60000, // 5 jobs per minute (heavy jobs)
    },
  }),
};

/**
 * Start all job workers
 */
export async function startJobWorkers(): Promise<void> {
  try {
    logger.info('Starting job workers');

    // Setup error handlers for all workers
    for (const [name, worker] of Object.entries(workers)) {
      worker.on('completed', job => {
        logger.info(
          {
            worker: name,
            jobId: job.id,
            processedOn: job.processedOn,
            finishedOn: job.finishedOn,
          },
          'Job completed successfully'
        );
      });

      worker.on('failed', (job, err) => {
        logger.error(
          {
            worker: name,
            jobId: job?.id,
            error: err.message,
            failedReason: job?.failedReason,
          },
          'Job failed'
        );
      });

      worker.on('error', err => {
        logger.error({ worker: name, error: err.message }, 'Worker error');
      });

      worker.on('stalled', jobId => {
        logger.warn({ worker: name, jobId }, 'Job stalled');
      });
    }

    logger.info('Job workers started successfully');
  } catch (error) {
    logger.error(error, 'Failed to start job workers');
    throw error;
  }
}

/**
 * Stop all job workers
 */
export async function stopJobWorkers(): Promise<void> {
  try {
    logger.info('Stopping job workers');

    await Promise.all(Object.values(workers).map(worker => worker.close()));

    logger.info('Job workers stopped successfully');
  } catch (error) {
    logger.error(error, 'Error stopping job workers');
    throw error;
  }
}
