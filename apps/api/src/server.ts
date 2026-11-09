import 'dotenv/config';

import { buildApp } from "./app.js";

const app = buildApp();

const start = async (): Promise<void> => {
    try {
        const port = Number(process.env.port ?? 3000);
        const host = process.env.host ?? '127.0.0.1';

        await app.listen({port, host});
    } catch (error) {
        app.log.error(error);
        process.exit(1);
    }
};

start();