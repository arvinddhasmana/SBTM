
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
    getHealth(): any {
        return {
            status: 'ok',
            service: 'student-presence',
            timestamp: new Date().toISOString(),
        };
    }
}
