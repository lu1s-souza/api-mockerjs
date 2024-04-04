import { createServer as _createServer } from 'http';
import { readFileSync, readdir } from 'fs';
// ESM
import { faker } from '@faker-js/faker';
import { Parser } from './lib/interface-parser/parser.js';

function createRandomUser(objKeys) {
  const returnedObj = {

  }

  objKeys.forEach((v) => {
    if (v.includes("id")) returnedObj[v] = faker.string.uuid();
    if (v === "firstName") returnedObj[v] = faker.person.firstName();
    if (v === "lastName") returnedObj[v] = faker.person.lastName();
    if (v === "createdTimestamp") returnedObj[v] = faker.date.past().getTime();
    if (v === "username") returnedObj[v] = faker.internet.userName();
    if (v === "email") returnedObj[v] = faker.internet.email();
  })
  return returnedObj;
}
function createServer(endpoints) {
  return _createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); /* @dev First, read about security */
    res.setHeader('Access-Control-Allow-Methods', '*');
    res.setHeader('Access-Control-Max-Age', 2592000); // 30 days
    res.setHeader('Access-Control-Allow-Headers', '*'); // Might be helpful
    // You can also set using the following method
    res.writeHead(200, { 'Content-Type': 'application/json' });

    let json = JSON.stringify({
      err: 'Endpoint not found'
    });
    const endpoint = req.url.replace(/(^\/)|(([a-z]+)[A-Z]*\/([a-z][0-9]\/)?)/g, '').replace('v1/', '')
    const endpointFile = endpoints.find((_endpoint) => _endpoint === endpoint);
    // console.log('endpoint', endpointFile);
    // console.log('endpoint', endpoints);
    // console.log('endpoint', endpoint);

    if (endpointFile) {
      // console.log('cx');

      // const resultArray = faker.helpers.multiple(() => createRandomUser(Object.keys(parsedObj)), {
      //   count: 5,
      // });
      json = readFileSync(`${process.cwd()}/endpoints/${endpointFile}.json`, 'utf-8');
      switch (endpoint) {
        case 'getListTasks':
          new Promise((resolve, reject) => {
            let body = "";

            req.on("data", (chunk) => {
              body += chunk;
            });

            req.on("end", () => {
              try {
                body = body ? JSON.parse(body) : {};

                resolve(body);
              } catch (error) {
                reject(error);
              }
            });
          }).then((data) => {
            const parsedJson = JSON.parse(json);
            parsedJson.values = parsedJson.values.splice((data.page * 10), data.size);
            json = JSON.stringify(parsedJson);
            res.end(json);
          });
          break;

        case 'listUsers':
          const p = new Parser('/Users/luissouza/projects/servidor-de-terminologias/pt.spms.fe/src/app/common/interfaces');
          p.parseInterfaces();
          // const tempJson = JSON.parse(json);
          // tempJson.values = resultArray;
          res.end(json);
          break

        default:
          res.end(json);
          break;
      }
    }
    else {
      json = readFileSync(`${process.cwd()}/endpoints/requestError.json`, 'utf-8')
      res.end(json);
    }


  })
}

new Promise((resolve, reject) => {
  readdir(process.cwd() + "/endpoints", (err, files) => {
    if (err) reject(err);
    resolve(createServer(files.map((f) => f.split(/\./)[0])));
  })
}).then((server) => server.listen(8000));
