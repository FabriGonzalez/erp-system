-- Usuario y email se comparan sin distinguir mayúsculas: "Juan" y "juan" (o "Juan@mail.com" y
-- "juan@mail.com") no pueden existir los dos. El login busca el usuario así
-- (findByUsernameIgnoreCase), y no se sabría a cuál entrar. Los servicios ya lo validan antes de
-- guardar; los índices lo garantizan también ante dos altas simultáneas.
CREATE UNIQUE INDEX uk_users_username_lower ON users (lower(username));
CREATE UNIQUE INDEX uk_users_email_lower ON users (lower(email));
