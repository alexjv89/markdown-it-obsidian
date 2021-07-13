'use strict'

const Plugin = require('markdown-it-regexp')
const extend = require('extend')
const sanitize = require('sanitize-filename')

module.exports = (options) => {

  const defaults = {
    baseURL: '/',
    relativeBaseURL: './',
    makeAllLinksAbsolute: false,
    uriSuffix: '',
    htmlAttributes: {
    },
    generatePageNameFromLabel: (label) => {
      return label
    },
    postProcessPageName: (pageName) => {
      pageName = pageName.trim()
      pageName = pageName.split('/').map(sanitize).join('/')
      pageName = pageName.replace(/\s+/, '_')
      return pageName
    },
    postProcessLabel: (label) => {
      label = label.trim()
      return label
    }
  }

  options = extend(true, defaults, options)

  function isAbsolute(pageName) {
    return true
    // return options.makeAllLinksAbsolute || pageName.charCodeAt(0) === 0x2F/* / */
  }

  function removeInitialSlashes(str) {
    return str.replace(/^\/+/g, '')
  }
    // /\[\[([\w\-\s/]+)(\|([\w\s/]+))?\]\]/,

  return Plugin(
    /!?\[\[(([^\]#\|]*)(#[^\|\]]+)*(\|[^\]]*)*)\]\]/,
    (match, utils) => {
      // console.log(process.cwd());
      let label = ''
      let pageName = ''
      let href = ''
      let htmlAttrs = []
      let htmlAttrsString = ''
      const isSplit = !!match[3]
      if (isSplit) {
        label = match[3]
        pageName = match[1]
      }
      else {
        label = match[1]
        pageName = options.generatePageNameFromLabel(label)
      }

      label = options.postProcessLabel(label)
      pageName = options.postProcessPageName(pageName)

      // make sure none of the values are empty
      if (!label || !pageName) {
        return match.input
      }

      if (isAbsolute(pageName)) {
        pageName = removeInitialSlashes(pageName)
        href = options.baseURL + pageName + options.uriSuffix
      }
      else {
        href = options.relativeBaseURL + pageName + options.uriSuffix
      }
      const fs = require("fs")
      const path = require("path")
      var avoid=['.git','_site','node_modules','.obsidian']

      const getAllFiles = function(dirPath, arrayOfFiles) {
        var files = fs.readdirSync(dirPath)

        var arrayOfFiles = arrayOfFiles || []

        files.forEach(function(file) {
          var skip=false;
          avoid.forEach(function(f){
            if(f==file)
              skip=true;
          })
          if(!skip){
            if (fs.statSync(dirPath + "/" + file).isDirectory()) {
              arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles)
            } else {
              arrayOfFiles.push(path.join(dirPath, "/", file))
            }
          }
        })

        return arrayOfFiles
      }

      var all_files=getAllFiles(process.cwd());
      var shortlists=[];
      all_files.forEach(function(file){
        // skip files in assets folder
        if(file.indexOf('/assets/')>-1)
          return;
        // use this for debugging
        // if(match[1]=='CSS')
        //   console.log('test point');

        // if file name contains the obsidian string somewhere
        if(file.indexOf(match[1])>-1){
          href=file.split(process.cwd())[1].split('.md')[0];
          // the value before it should be a slash. 
          // e.g.
          // '/notes/CSS', '/notes/Device size specific CSS'
          // when searching for CSS 2nd link is not valid. 
          var i = href.indexOf(match[1]);
          if(href[i-1]=='/')
            shortlists.push(href);
        }
      })
      href='';
      // if there is more than one match, we look for exact match
      if(shortlists.length>1){
        shortlists.forEach(function(file){
          if(match[1]==file)
            href=file;
        })
      }if(shortlists.length==1){
        href=shortlists[0];
      }

      // use this for debugging
      // console.log('\n\n\n\n\n---------test---------')
      // console.log('obsidian url to match - '+match[1]);
      // console.log('shortlists:')
      // console.log(shortlists);
      // console.log('final url:')
      // console.log(href);
      href = utils.escape(href)

      htmlAttrs.push(`href="${href}"`)
      for (let attrName in options.htmlAttributes) {
        const attrValue = options.htmlAttributes[attrName]
        htmlAttrs.push(`${attrName}="${attrValue}"`)
      }
      htmlAttrsString = htmlAttrs.join(' ')
      if(match[0].startsWith('!'))
        return `<img src="${href}"></img>`
      else
        return `<a ${htmlAttrsString}>${label}</a>`
    }
  )
}
