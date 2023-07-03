const dal = require('./searchDAL');

const performSearchService = async (searchQuery) => {
  // The user provided search query is piped so that it can be used by the postgres
  // full text search function to_tsquery. The whitespaces in the query are removed and all
  // whitespaces between words are replaced by a '|' delimiter.
  const pipedSearchQuery = searchQuery.trim().replace(/\s+/g, '|');
  const searchResults = await dal.search(pipedSearchQuery);
  return searchResults;
};

module.exports = { performSearchService };
