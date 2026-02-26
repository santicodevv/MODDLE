import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { entities } from './entities';

export default registerAs(
  'database',
  (): TypeOrmModuleOptions => ({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'moddle_user',
    password: process.env.DB_PASSWORD || 'moddle_pass',
    database: process.env.DB_NAME || 'moddle_db',
    entities: entities,
    synchronize: process.env.NODE_ENV === 'development', // Solo en desarrollo
    logging: process.env.NODE_ENV === 'development',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  }),
);
