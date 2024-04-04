import { readFile, readdir } from 'fs/promises'
import { faker } from '@faker-js/faker'

export class Parser {
  rootPath = ""
  constructor(rootPath) {
    this.rootPath = rootPath;
  }


  async parseInterfaces() {
    const returnedValue = new Map();
    let filesArr = await this.getFiles();
    filesArr = filesArr.filter((f) => f !== 'index.ts');
    let count = 0;
    for (const file of filesArr) {
      count++;
      const aa = await readFile(`${this.rootPath}/${file}`, 'utf-8')
      returnedValue.set(file, aa);
    }
    returnedValue.forEach((v, k) => {
      let interfacesOnFile = v.replace(/export interface |\t|\n/g, ' ').trim();
      let extensibleInterfaces = interfacesOnFile.match(/([A-z]+) extends [A-z]+/g);
      console.log('interfaces on file', k, '\n', interfacesOnFile)
      const interfacesMap = new Map();
      if (extensibleInterfaces) {
        extensibleInterfaces.forEach(a => {
          const relation = a.split(' extends ');
          interfacesMap.set(relation[0], relation[1]);
        })
      }

      let uniqueInterfaces = new Set(interfacesOnFile.match(/([A-z](<T>)?)+ (?={)/g).map((v) => v.trim()));
      uniqueInterfaces.forEach((ui) => {
        interfacesMap.set(ui)
      })
      console.log('interfacesMap', interfacesMap)
      const regex = new RegExp(/^[A-Z][a-z]+[A-z]?/);
      const inputsOrder = new Set(interfacesOnFile.split(" ").filter((iof) => regex.test(iof)));
      const interfacesArr = interfacesOnFile.replace(/(([A-z])+ )((?={)?)/g, '$splitMe').split('$splitMe').filter((iv) => iv !== '')
        .map((iv, i) => {

          let quotesArray = iv.replace(/({||})?/g, '').replace(/\,/g, ';').split(';');
          if (quotesArray.length === 0) return iv;

          // console.log(quotesArray);
          quotesArray = quotesArray.map(q => q.trim()).join(' ').split(': ').join(' ').split(' ').map(q => `"${q}"`);
          const result = [];
          for (let index = 0; index < quotesArray.length; index++) {
            if (index === 0) continue;
            const element = quotesArray[index];
            let parsedString = `${quotesArray[index - 1]}: ${element}`
            index++
            result.push(parsedString);
          }
          const parsedObj = JSON.parse(`{ ${result.join(',')} }`);
          return parsedObj;
        });
      console.log('parsedInterface', interfacesArr);
      const finalData = new Map();
      const extensibleInterfaceMap = new Map();
      interfacesArr.forEach((itd, i) => {
        const _io = [...inputsOrder]
        console.log(_io[i]);
        if (interfacesMap.get(_io[i]) === undefined) {
          const resultArray = faker.helpers.multiple(() => this.buildRandomData(Object.keys(itd)), {
            count: 5,
          });
          finalData.set(_io[i], resultArray)
        } else {
          extensibleInterfaceMap.set(_io[i], this.buildRandomData(Object.keys(itd)))
        }

      })
      interfacesMap
        .forEach((val, key) => {
          if (val !== undefined) {
            finalData.set(key, [
              ...finalData.get(val).map(items => ({ ...items, ...extensibleInterfaceMap.get(key) }))
            ]);
          }
        })
      // console.log(`interfaces on ${k}: `, interfacesArr)
      // console.log(`interface uniqueInterfaces on ${k}`, uniqueInterfaces)
      // console.log(`interface extensibleInterfaces on ${k}`, extensibleInterfaces)
      console.log(`interface finalData on ${k}`, finalData)
      // console.log(`interface extensibleInterfacesMap on ${k}`, extensibleInterfacesMap)
    })
  }

  async getFiles() {
    return await readdir(this.rootPath);
  }


  buildRandomData(objKeys) {
    const returnedObj = {

    }

    objKeys.forEach((v) => {
      if (v.includes("Id") || v.includes("id")) returnedObj[v] = faker.string.uuid();
      if (v === "userFirstName") returnedObj[v] = faker.person.firstName();
      if (v === "userLastName") returnedObj[v] = faker.person.lastName();
      if (v === "email") returnedObj[v] = faker.internet.email();
      if (v === "username" || v === 'preferredUserName' || v === 'groupName') returnedObj[v] = faker.internet.userName();
      if (v === "password") returnedObj[v] = faker.internet.password();
      if (v === 'emailVerified') returnedObj[v] = true;
      if (v === "sessionExpirationTime") returnedObj[v] = faker.date.past().getTime();

    })
    return returnedObj;
  }

}
