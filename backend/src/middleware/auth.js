module.exports = function auth(req, res, next) {
  return res.status(501).json({ error: "Not implemented", code: "NOT_IMPLEMENTED" });
};
