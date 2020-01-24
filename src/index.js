import { readdirSync, readFileSync } from "fs";
import { normalize, basename } from "path";
import { memoize, search } from "cerebro-tools";
import { exec } from "child_process";

const homedir = require("os").homedir();
const icon = require("../plugin-icon.png");

let projects;

const getPhpStormConfigDir = memoize(() => {
  const files = readdirSync(homedir);
  let versions = {};
  let latest;
  for (const file of files) {
    if (~file.indexOf("PhpStorm")) {
      versions[file.slice(9).replace(".", "")] = file;
    }
  }
  latest = Math.max(...Object.keys(versions));
  return normalize(
    `${homedir}/${versions[latest]}/config/options/recentProjectDirectories.xml`
  );
});

const getProjects = memoize(() => {
  const configPath = getPhpStormConfigDir();
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(readFileSync(configPath), "text/xml");
  const options = xmlDoc
    .getElementsByName("recentPaths")[0]
    .getElementsByTagName("option");

  const projects = [...options].map(
    elem => {
      let _path = elem.getAttribute("value");
      return {
        name: basename(_path).replace(/^./, basename(_path)[0].toUpperCase()),
        path: normalize(_path.replace("$USER_HOME$", homedir))
      };
    },
    { maxAge: 30 * 60 * 1000 }
  );

  return projects;
});

const plugin = ({ term, display }) => {
  let match = term.match(/^phpstorm\s?(.+)?$/);
  match = match || term.match(/^(.+)\sphp(storm)?$/);
  if (match) {
    if (typeof projects === "undefined") {
      projects = getProjects();
    }
    let response = projects.map(p => {
      return {
        icon,
        title: p.name,
        subtitle: p.path,
        onSelect: () => exec(`phpstorm ${p.path}`, [p.path])
      };
    });

    if (match[1]) {
      response = search(response, match[1], item => item.title);
    }
    display(response);
  }
};

export { getProjects as initialize, plugin as fn };
export const keyword = "phpstorm";
export const name = "Seach Phpstorm Projects...";
