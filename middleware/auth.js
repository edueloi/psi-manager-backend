import jwt from 'jsonwebtoken';

export function authenticate(req, res, next) {
  const header = req.headers.authorization || '';

  // Espera: "Bearer <token>"
  const [type, token] = header.split(' ');

  if (type !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Token ausente' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = payload; // { user_id, tenant_id, role }
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

// Uso: authorize('admin') ou authorize('admin','super_admin')
export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Não autenticado' });

    // Se não passar roles, deixa passar (útil em alguns casos)
    if (!roles.length) return next();

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Permissão negada' });
    }
    return next();
  };
}

// Opcional: rotas que exigem tenant_id (ex.: pacientes, agenda)
export function requireTenant(req, res, next) {
  if (!req.user?.tenant_id) {
    return res.status(403).json({ error: 'Acesso requer tenant' });
  }
  next();
}
