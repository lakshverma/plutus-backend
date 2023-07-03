const { TENANT_CONTEXT } = require('../../common/util/config');
const { performSearchService } = require('./searchService');

const searchQuery = async (req, res) => {
  const { q } = req.query;
  if (!(TENANT_CONTEXT.orgId && TENANT_CONTEXT.userId)) {
    TENANT_CONTEXT.tenantInfo = req.user.orgId;
    TENANT_CONTEXT.userInfo = req.user.userId;
  }
  const searchResult = await performSearchService(q);
  return res.status(200).json(searchResult);
};

module.exports = {
  searchQuery,
};
