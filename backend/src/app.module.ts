import { Module } from '@nestjs/common';

import { AxiosModule } from '@common/axios/axios.module';
import { AppConfigModule } from '@common/config/app-config/app-config.module';

import { SubscriptionPageBackendModule } from '@modules/subscription-page-backend.modules';

@Module({
    imports: [AppConfigModule, AxiosModule, SubscriptionPageBackendModule],
})
export class AppModule {}
