import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Acesso negado. Apenas administradores.' }, { status: 403 });
        }

        const usuarios = await base44.asServiceRole.entities.User.list();
        return Response.json({ usuarios });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});