# Biblioteca Viva de Historia

Sitio estatico pensado para desplegar en Netlify y usar Supabase Free como backend.

## Que incluye

- Portada responsive para computador y telefono.
- Login real en `/admin` usando Supabase Auth.
- Panel para editar:
  - colores del fondo y tintes del sitio
  - imagen de fondo
  - imagen principal de portada
  - secciones del menu inicial
  - articulos con imagen, fuente, fecha o era historica
- Subida de imagenes `jpg`, `png` y `webp` a Supabase Storage.

## Configuracion de Supabase

1. Crea un proyecto en Supabase.
2. En `SQL Editor`, ejecuta [supabase/schema.sql](./supabase/schema.sql).
3. En `Authentication > Users`, crea manualmente tu usuario admin con correo y contrasena.
4. En `Project Settings > API`, copia:
   - `Project URL`
   - `anon public key`
5. Reemplaza los placeholders de [public/supabase-config.js](./public/supabase-config.js).

## Deploy en Netlify

1. Sube este proyecto a un repositorio Git.
2. En Netlify, crea un sitio desde ese repo.
3. El directorio de publicacion ya esta configurado en [netlify.toml](./netlify.toml) como `public`.
4. Asigna tu dominio personalizado desde Netlify.

## Notas

- La ruta de admin no aparece en el menu publico; solo abre si visitas `/admin`.
- La seguridad real depende del login de Supabase y las policies de RLS.
- Si quieres ocultar aun mas la configuracion, puedes mover `supabase-config.js` a un paso de build posterior, pero para un sitio estatico con `anon key` esto es normal.
