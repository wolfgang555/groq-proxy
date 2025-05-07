// fixed-proxy.ts

/**
 * Deno API 代理服务 - 优化用于处理 Groq API 请求
 */

// 配置选项
const CONFIG = {
  port: 8080,
  logRequests: true,  // 记录请求日志
  groqApiEndpoint: "https://api.groq.com", // Groq API 端点
};

async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // 处理根路径请求
  if (pathname === '/' || pathname === '/index.html') {
    return new Response(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Groq API Proxy</title>
      </head>
      <body>
        <h1>Groq API Proxy is Running!</h1>
        <p>This proxy is configured to forward requests to the Groq API.</p>
      </body>
      </html>
    `, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }

  // 处理所有其他请求，假设它们都应该发送到 Groq API
  const targetUrl = `${CONFIG.groqApiEndpoint}${pathname}${url.search}`;
  
  if (CONFIG.logRequests) {
    console.log(`[${new Date().toISOString()}] ${request.method} ${pathname} -> ${targetUrl}`);
  }

  try {
    // 构建传递给目标 API 的头部
    const headers = new Headers();
    
    // 复制所有传入的头部
    for (const [key, value] of request.headers.entries()) {
      // 避免复制 host 头，因为我们将请求转发到不同的主机
      if (key.toLowerCase() !== 'host') {
        headers.set(key, value);
      }
    }

    // 处理原始请求的方法和主体
    const fetchOptions: RequestInit = {
      method: request.method,
      headers: headers,
      redirect: 'follow',
    };

    // 添加请求体，如果存在的话
    if (!['GET', 'HEAD'].includes(request.method)) {
      fetchOptions.body = request.body;
    }

    // 向 Groq API 发送请求
    const response = await fetch(targetUrl, fetchOptions);

    // 创建响应头
    const responseHeaders = new Headers(response.headers);
    
    // 添加 CORS 头，允许跨域请求
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', '*');
    
    // 返回响应
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });
  } catch (error) {
    console.error(`[ERROR] Failed to fetch ${targetUrl}:`, error);
    return new Response(`Proxy Error: ${error.message || 'Unknown error'}`, { 
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

// 处理 OPTIONS 请求（预检请求）
function handleOptions(_request: Request): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Max-Age': '86400',
    }
  });
}

// 主要处理函数
function mainHandler(request: Request): Promise<Response> {
  // 处理 CORS 预检请求
  if (request.method === 'OPTIONS') {
    return Promise.resolve(handleOptions(request));
  }
  
  return handleRequest(request);
}

// 启动服务器并输出明确的日志
console.log(`Starting Groq API Proxy on port ${CONFIG.port}...`);
console.log(`Server is running at: http://localhost:${CONFIG.port}`);
console.log(`Forwarding requests to: ${CONFIG.groqApiEndpoint}`);
Deno.serve( { 
  port: CONFIG.port,
  hostname: "0.0.0.0"  // 绑定到所有接口，而不仅仅是 localhost
}, mainHandler);
