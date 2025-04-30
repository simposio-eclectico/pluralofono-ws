# Pluralófono

Pluralófono es un proyecto que permite la comunicación entre clientes pluralofonísticos a través de WebSocket.

## Instalación

```bash
pnpm install
```

## Ejecución

```bash
pnpm run start
```

## Configuración

Se puede configurar el puerto y el timeout de los heartbeats a través de variables de entorno.
Los valores por defecto se encuentran en el archivo `config.js`.
Los endpoints pueden ser modificados en el archivo `server.js`.

## Endpoints

- `/v1`: Endpoint para la versión 1 del protocolo.
- `/v2`: Endpoint para la versión 2 del protocolo.
- `/avro`: Endpoint para la versión Avro del protocolo.
- `/signaling`: Endpoint para la versión Signaling del protocolo.

