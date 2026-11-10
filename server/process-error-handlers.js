export function installProcessErrorLogging(processObject = process, logger = console) {
    // Monitor the failure without intercepting it. Node must retain its default
    // fatal behavior so the supervisor can restart a process in an unknown state.
    processObject.on('uncaughtExceptionMonitor', (error, origin) => {
        logger.error('----- Uncaught exception -----');
        logger.error(error);
        logger.error('----- Exception origin -----');
        logger.error(origin);
    });
}
