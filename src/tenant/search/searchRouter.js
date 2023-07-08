const Router = require('express-promise-router');
const { validateQueryChars } = require('./searchValidator');
const { searchQuery } = require('./searchController');
const { authorize } = require('../../common/util/middleware');
const { ROLES } = require('../../common/util/helper');

const router = new Router();

// Currently all users can perform all searches.
// In future releases, Users with limited role will only be able to search only tasks
router.get('/', [authorize(['root', ROLES.superAdmin, ROLES.admin, ROLES.standard, ROLES.limited]), validateQueryChars], searchQuery);

module.exports = router;
