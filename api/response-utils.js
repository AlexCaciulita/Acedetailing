export function createExpressLikeResponse(res) {
  const wrapper = {
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
