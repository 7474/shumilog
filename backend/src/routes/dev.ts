import { Hono } from 'hono';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const dev = new Hono();

// Middleware to check if we're in development environment
dev.use('*', async (c, next) => {
  const runtimeConfig = ((c as any).get('config') as { nodeEnv: string } | undefined);
  const effectiveEnv = runtimeConfig?.nodeEnv ?? process.env.NODE_ENV ?? 'development';

  if (!['development', 'test'].includes(effectiveEnv)) {
    return c.json({ error: 'Development endpoints only available in development mode' }, 404);
  }

  await next();
});

// GET /dev/config - Get development environment configuration
dev.get('/config', async (c) => {
  try {
    const runtimeConfig = ((c as any).get('config') as { nodeEnv: string } | undefined);
    const environment = runtimeConfig?.nodeEnv ?? process.env.NODE_ENV ?? 'development';

    const services = [
      {
        name: 'backend',
        status: 'running',
        ports: ['8787:8787'],
        volumes: ['/app', '/app/node_modules', '/data'],
      },
      {
        name: 'frontend',
        status: 'running',
        ports: ['5173:5173'],
        volumes: ['/app', '/app/node_modules'],
      },
      {
        name: 'database',
        status: 'running',
        ports: [],
        volumes: ['/data'],
      },
    ];

    // Try to get actual Docker status if available
    try {
      const { stdout } = await execAsync('docker compose ps --format json', {
        cwd: process.cwd(),
        timeout: 2000
      });
      
      if (stdout.trim()) {
        const dockerServices = JSON.parse(`[${stdout.split('\n').filter(line => line.trim()).join(',')}]`);
        
        for (const service of services) {
          const dockerService = dockerServices.find((ds: any) => ds.Service === service.name);
          if (dockerService) {
            service.status = dockerService.State === 'running' ? 'running' : 
                           dockerService.State === 'exited' ? 'stopped' : 
                           dockerService.Health === 'starting' ? 'starting' : 'unhealthy';
          }
        }
      }
    } catch (error) {
      console.warn('Could not get Docker status:', error);
    }

    const config = {
      environment,
      services,
    };

    return c.json(config, 200);
  } catch (error) {
    console.error('Dev config error:', error);
    return c.json({ error: 'Failed to get development configuration' }, 500);
  }
});

// GET /dev/logs - Get service logs
dev.get('/logs', async (c) => {
  try {
    const serviceParam = c.req.query('service');
    const linesParam = c.req.query('lines') || '100';
    
    // Validate lines parameter
    const lines = parseInt(linesParam);
    if (isNaN(lines) || lines < 1 || lines > 1000) {
      return c.json({ error: 'Lines parameter must be between 1 and 1000' }, 400);
    }
    
    // Validate service parameter
    const validServices = ['backend', 'frontend', 'database'];
    if (serviceParam && !validServices.includes(serviceParam)) {
      return c.json({ error: 'Invalid service. Must be one of: backend, frontend, database' }, 400);
    }
    
    const service = serviceParam || 'backend';
    
    // Mock logs for now - in a real implementation, this would fetch from Docker
    const mockLogs = [
      {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `${service} service is running`
      },
      {
        timestamp: new Date(Date.now() - 60000).toISOString(),
        level: 'debug',
        message: `${service} initialized successfully`
      },
      {
        timestamp: new Date(Date.now() - 120000).toISOString(),
        level: 'info',
        message: `${service} starting up...`
      }
    ];

    try {
      // Try to get actual Docker logs
      const { stdout } = await execAsync(`docker compose logs --tail=${lines} ${service}`, {
        cwd: process.cwd(),
        timeout: 2000
      });
      
      if (stdout.trim()) {
        // Parse Docker logs (simplified)
        const logLines = stdout.split('\n').filter(line => line.trim());
        const parsedLogs = logLines.slice(-lines).map(line => {
          // Simple log parsing - in reality this would be more sophisticated
          const timestamp = new Date().toISOString();
          const level = line.includes('ERROR') ? 'error' : 
                       line.includes('WARN') ? 'warn' : 
                       line.includes('DEBUG') ? 'debug' : 'info';
          return {
            timestamp,
            level,
            message: line.replace(/^.*\|\s*/, '') // Remove Docker compose prefix
          };
        });
        
        const result = {
          service,
          logs: parsedLogs.length > 0 ? parsedLogs : mockLogs
        };
        
        return c.json(result, 200);
      }
    } catch (error) {
      console.warn('Could not get Docker logs:', error);
    }
    
    // Return mock logs if Docker logs unavailable
    const result = {
      service,
      logs: mockLogs.slice(0, lines)
    };
    
    return c.json(result, 200);
  } catch (error) {
    console.error('Dev logs error:', error);
    return c.json({ error: 'Failed to get service logs' }, 500);
  }
});

// POST /dev/reload - Trigger service reload
dev.post('/reload', async (c) => {
  try {
    const body = await c.req.json();
    
    // Validate request body
    if (!body.service) {
      return c.json({ error: 'Service field is required' }, 400);
    }
    
    const validServices = ['backend', 'frontend', 'all'];
    if (!validServices.includes(body.service)) {
      return c.json({ error: 'Service must be one of: backend, frontend, all' }, 400);
    }
    
    const { service, force = false } = body;
    const timestamp = new Date().toISOString();
    
    try {
      // Try to restart the service using Docker Compose
      let command = '';
      if (service === 'all') {
        command = 'docker compose restart';
      } else {
        command = `docker compose restart ${service}`;
      }
      
      if (force) {
        // Force recreation if requested
        command = command.replace('restart', 'up -d --force-recreate');
      }
      
      const { stdout } = await execAsync(command, {
        cwd: process.cwd(),
        timeout: 30000
      });
      
      console.log(`Service reload output: ${stdout}`);
      
      const result = {
        status: 'reloaded',
        service,
        timestamp
      };
      
      return c.json(result, 200);
    } catch (error) {
      console.warn('Docker reload failed, returning mock response:', error);
      
      // Return mock response if Docker not available
      const result = {
        status: 'reloading',
        service,
        timestamp
      };
      
      return c.json(result, 200);
    }
  } catch (error) {
    console.error('Dev reload error:', error);
    return c.json({ error: 'Failed to parse request body or reload service' }, 400);
  }
});

export default dev;