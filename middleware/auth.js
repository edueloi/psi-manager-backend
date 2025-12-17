import jwt from 'jsonwebtoken';

export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'Token ausente' });

  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

// Permite restringir rotas conforme o papel do usuário
export function authorize(roles = []) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Permissão negada' });
    }
    next();
  };
}
