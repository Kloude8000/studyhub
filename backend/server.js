const app = require("./app");

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

server.timeout = 0;
server.headersTimeout = 0;
server.requestTimeout = 0;
