import { Module, Global } from '@nestjs/common';
import { HttpClientService } from './utils/http-client.service';

@Global()
@Module({
    providers: [HttpClientService],
    exports: [HttpClientService],
})
export class CommonModule { }
