import { faker } from "@faker-js/faker";
import { readFile, readdir } from "fs/promises";

export class Parser {
  rootPath: string;
  fileContentMap = new Map<string, string>();
  interfacesRelationMap = new Map<string, string | undefined>();
  orderingRegex = new RegExp(/^[A-Z][a-z]+[A-z]?/);
  constructor(rootPath: string) {
    this.rootPath = rootPath
  }

  async getFilesInPath() {
    const files = await readdir(this.rootPath);
    const filteredFilesArr = files.filter((f) => f !== 'index.ts');
    for (const file of filteredFilesArr) {
      const fileContent = await readFile(`${this.rootPath}/${file}`, 'utf-8')
      this.fileContentMap.set(file, fileContent);
    }
  }

  loadInterfacesOnFile() {
    if (this.fileContentMap.size === 0) return [];
    this.fileContentMap.forEach((fValue, fName) => {
      const interfacesOnFile = fValue.replace(/export interface |\t|\n/g, ' ').trim();
      console.log('interfaces on file', fName, '\n', interfacesOnFile)
      this.extractExtendedInterfaces(interfacesOnFile)
      this.extractUniqueInterfaces(interfacesOnFile);
      console.log(this.buildInterfaces(interfacesOnFile));
      this.interfacesRelationMap.clear();
    })
  }

  extractExtendedInterfaces(interfacesOnFile: string) {
    const extensibleInterfacesOnFile = interfacesOnFile.match(/([A-z]+) extends [A-z]+/g);
    if (extensibleInterfacesOnFile) {
      extensibleInterfacesOnFile.forEach(extensibleInterface => {
        const relation = extensibleInterface.split(' extends ');
        this.interfacesRelationMap.set(relation[0], relation[1]);
      })
    }
  }

  extractUniqueInterfaces(interfacesOnFile: string) {
    const hasInterfaces = interfacesOnFile.match(/([A-z](<T>)?)+ (?={)/g);
    if (!hasInterfaces) return
    const interfacesSet = new Set<string>(hasInterfaces.map((v) => v.trim()));
    interfacesSet.forEach(_interface => this.interfacesRelationMap.set(_interface, undefined));
  }

  parseInterfaces(interfacesOnFile: string) {
    return interfacesOnFile
      .replace(/(([A-z])+ )((?={)?)/g, '$splitMe')
      .split('$splitMe')
      .filter((iof) => iof !== '')
      .map((iof) => {
        let quotesArray = iof.replace(/({||})?/g, '').replace(/\,/g, ';').split(';');
        if (quotesArray.length === 0) return iof;

        quotesArray = quotesArray.map(q => q.trim()).join(' ').split(': ').join(' ').split(' ').map(q => `"${q}"`).filter((_, i) => i > 0);
        const result: string[] = [];
        for (let index = 0; index < quotesArray.length; index++) {
          const element = quotesArray[index];
          let parsedString = `${quotesArray[index - 1]}: ${element}`
          index++
          result.push(parsedString);
        }
        const parsedObj = JSON.parse(`{ ${result.join(',')} }`);
        return parsedObj;
      });

  }

  buildInterfaces(interfacesOnFile: string) {
    const inputsOrder = new Set<string>(interfacesOnFile.split(" ").filter((iof: string) => this.orderingRegex.test(iof)));
    const interfacesArr = this.parseInterfaces(interfacesOnFile);
    console.log('parsedInterface', interfacesArr);
    const finalData = new Map();
    const extensibleInterfaceMap = new Map();
    interfacesArr.forEach((itd, i) => {
      const _io = [...inputsOrder]
      console.log(_io[i], ' entering');
      if (this.interfacesRelationMap.get(_io[i]) === undefined) {
        const resultArray = faker.helpers.multiple(() => this.buildRandomData(Object.keys(itd)), {
          count: 5,
        });
        finalData.set(_io[i], resultArray)
      } else {
        extensibleInterfaceMap.set(_io[i], this.buildRandomData(Object.keys(itd)))
      }
      console.log(_io[i], 'exiting');
    })
    console.log(finalData, 'finalData')
    this.interfacesRelationMap.forEach((val, key) => {
      console.log('val', val, 'key', key)
      if (val !== undefined) {
        finalData.set(key, [
          ...finalData.get(val).map(items => ({ ...items, ...extensibleInterfaceMap.get(key) }))
        ]);
      }
    })
    return finalData;
    // console.log(`interfaces on ${k}: `, interfacesArr)
    // console.log(`interface uniqueInterfaces on ${k}`, uniqueInterfaces)
    // console.log(`interface extensibleInterfaces on ${k}`, extensibleInterfaces) 
  }

  buildRandomData(keys: string[]) {
    const returnedObj = {

    }

    keys.forEach((v) => {
      returnedObj[v] = faker.word.sample();
      if (v.includes("Id") || v.includes("id")) returnedObj[v] = faker.string.uuid();
      if (v.includes("userFirstName")) returnedObj[v] = faker.person.firstName();
      if (v.includes("userLastName")) returnedObj[v] = faker.person.lastName();
      if (v.includes("name") && v !== "userFirstName" && v !== "userLastName") returnedObj[v] = faker.person.fullName();
      if (v === "email") returnedObj[v] = faker.internet.email();
      if (v.toLowerCase().includes("username") || v === 'groupName') returnedObj[v] = faker.internet.userName();
      if (v === "password") returnedObj[v] = faker.internet.password();
      if (v === 'emailVerified') returnedObj[v] = true;
      if (v.toLowerCase().includes("time") || v.toLowerCase().includes("date")) returnedObj[v] = faker.date.past().getTime();

    })
    return returnedObj;
  }

}

