export function createExpressLikeResponse(res) {
  const wrapper = {
    // Explicit passthroughs. Reaching ServerResponse.setHeader through the
    // prototype chain instead would run it with `this` bound to the wrapper, so
    // Node stores the header on the wrapper and it never reaches the socket —
    // which silently dropped Set-Cookie on admin login.
    setHeader(name, value) {
      res.setHeader(name, value);
      return wrapper;
    },
    getHeader(name) {
      return res.getHeader(name);
    },
    removeHeader(name) {
      res.removeHeader(name);
      return wrapper;
    },
    status(code) {
      res.statusCode = code;
      return wrapper;
    },
    json(data) {
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
      }
      res.end(JSON.stringify(data));
      return wrapper;
    },
    send(data) {
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      }
      res.end(data);
      return wrapper;
    },
    end(data) {
      res.end(data);
      return wrapper;
    }
  };

  Object.setPrototypeOf(wrapper, res);

  return wrapper;
}
