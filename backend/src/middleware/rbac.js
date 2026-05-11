module.exports = function rbac() {
  return (req, res, next) => {
    return res.status(501).json({ error: "Not implemented", code: "NOT_IMPLEMENTED" });
  };
};
