const pug = require('pug')
const fs = require('fs')
const path = require('path')

const extension = '.picasso.js';

exports.constructor = async function (params) {
  return {
    watchers: [
      {
        extensions: [extension],
        handler: picassoHandler
      }
    ]
  }
}

var picassoHandler = async function (picassoPath, page) {
  var picassoSpec = fs.readFileSync(picassoPath, 'utf8');
  var html = pug.renderFile(path.join(__dirname, 'template.pug'), { picassoSpec })
  await page.setContent(html)
  await page.waitForSelector('#container svg')

  var svg = await page.evaluate(function () {
    var elList = document.querySelectorAll('#container svg')
    var el = elList[0];

    var maxWidth = 0;
    var maxHeight = 0;
    elList.forEach(elem => {
      const styleObj={};
      const style = elem.getAttribute('style');
      rules=style.split(';');
      rules = rules.filter(function(x){
        return (x !== (undefined || ''));
      }); // https://solidfoundationwebdev.com/blog/posts/remove-empty-elements-from-an-array-with-javascript

      const height = elem.getAttribute('height');
      const width = elem.getAttribute('width');

      if (height > maxHeight) {
        maxHeight = height;
      }

      if (width > maxWidth) {
        maxWidth = width;
      }

      for (i=0;i<rules.length;i++) {

        rules_arr=rules[i].split(/:(?!\/\/)/g); // split by : if not followed by //
        rules_arr[1]=rules_arr[1].trim().replace('url(','').replace(')','');

        if (rules_arr[0].indexOf('-')>=0) {
          rule=rules_arr[0].split('-');
          rule=rule[0]+rule[1].charAt(0).toUpperCase()+rule[1].slice(1);
        }
        else {
          rule=rules_arr[0];
        }
        styleObj[rule.trim()]=rules_arr[1];

      }

      const left = styleObj.left.replace('px', '');
      const top = styleObj.top.replace('px', '');
      const g2 = elem.childNodes[0];
      g2.setAttribute('transform', 'translate('+ left +', ' + top + ')');
      el.appendChild(g2);
    });

    el.removeAttribute('height')
    el.removeAttribute('width')
    el.removeAttribute('xmlns');
    el.removeAttribute('style');
    el.setAttribute('viewbox', '0 0 ' + maxWidth + ' ' + maxHeight);

    return el.outerHTML
  })

  var svgPath = picassoPath.substr(0, picassoPath.length - extension.length) + '.svg'
  fs.writeFileSync(svgPath, svg, 'utf8')
}
