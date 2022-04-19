const app = require("./src/app");
const http = require("http");
const { PORT } = require("./src/common/util/config");
const logger = require("./src/common/util/logger");

const server = http.createServer(app);

const start = () => {
  server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
};

start();
