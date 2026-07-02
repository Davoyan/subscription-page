process.title = 'rw-subpage';

import compression from 'compression';
import cookieParser from 'cookie-parser';
import * as ejs from 'ejs';
import { json } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { utilities as nestWinstonModuleUtilities, WinstonModule } from 'nest-winston';
import path from 'node:path';
import { createLogger } from 'winston';
import * as winston from 'winston';

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';

import { APP_CONFIG_ROUTE_WO_LEADING_PATH } from '@remnawave/subscription-page-types';

import { TypedConfigService } from '@common/config/app-config';
import { NotFoundExceptionFilter } from '@common/exception/not-found-exception.filter';
import { noRobotsMiddleware, proxyCheckMiddleware } from '@common/middlewares';
import { checkAssetsCookieMiddleware } from '@common/middlewares/check-assets-cookie.middleware';
import { getRealIp } from '@common/middlewares/get-real-ip';
import { customLogFilter } from '@common/utils/filter-logs/filter-logs';
import { isDevelopment, isDevOrDebugLogsEnabled } from '@common/utils/startup-app';
import { getStartMessage } from '@common/utils/startup-app/get-start-message';

import { AppModule } from './app.module';

// const levels = {
//     error: 0,
//     warn: 1,
//     info: 2,
//     http: 3,
//     verbose: 4,
//     debug: 5,
//     silly: 6,
// };

const instanceId = process.env.INSTANCE_ID || '0';

const logger = createLogger({
    transports: [new winston.transports.Console()],
    format: winston.format.combine(
        customLogFilter(),
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss.SSS',
        }),
        winston.format.ms(),
        nestWinstonModuleUtilities.format.nestLike(`#${instanceId}`, {
            colors: true,
            prettyPrint: true,
            processId: false,
            appName: true,
        }),
    ),
    level: isDevOrDebugLogsEnabled() ? 'debug' : 'http',
});

const assetsPath = isDevelopment()
    ? path.join(__dirname, '..', '..', 'dev_frontend')
    : '/opt/app/frontend';

async function bootstrap(): Promise<void> {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
        logger: WinstonModule.createLogger({
            instance: logger,
        }),
    });

    const config = app.get(TypedConfigService);

    app.disable('x-powered-by');

    app.set('trust proxy', config.getOrThrow('TRUST_PROXY'));

    app.use(cookieParser());

    app.use(noRobotsMiddleware, proxyCheckMiddleware, checkAssetsCookieMiddleware, getRealIp);

    app.useGlobalFilters(new NotFoundExceptionFilter());

    app.useStaticAssets(assetsPath, {
        index: false,
        dotfiles: 'ignore',
    });

    app.setBaseViewsDir(assetsPath);

    app.engine('html', ejs.renderFile);
    app.setViewEngine('html');

    app.use(json({ limit: '100mb' }));

    app.use(helmet({ contentSecurityPolicy: false }));

    app.use(compression());

    app.use(
        morgan(
            ':remote-addr - ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"',
            {
                skip: (req) => req?.url?.startsWith('/assets') ?? false,
            },
        ),
    );

    const customSubPrefix = config.get('CUSTOM_SUB_PREFIX');

    app.setGlobalPrefix(customSubPrefix ?? '', { exclude: [APP_CONFIG_ROUTE_WO_LEADING_PATH] });

    if (customSubPrefix) {
        logger.info('[CONFIG] CUSTOM_SUB_PREFIX: ' + customSubPrefix);
    } else {
        logger.info('[CONFIG] CUSTOM_SUB_PREFIX: not set');
    }

    app.enableCors({
        origin: '*',
        methods: 'GET',
        credentials: false,
    });

    app.enableShutdownHooks();

    await app.listen(Number(config.getOrThrow('APP_PORT')));

    logger.info('\n' + (await getStartMessage()) + '\n');
}
void bootstrap();
