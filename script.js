/* global hljs, sourceMap */

const shebang = '#!/'

class Entity {
  constructor(type, name, path, opts) {
    this.type = type
    this.name = name
    this.path = path
    Object.assign(this, opts)
  }
}
class Directory extends Entity {
  constructor(...args) {
    super('dir', ...args)
    this.children = this.children || []
  }
}
class File extends Entity {
  constructor(...args) {
    super('file', ...args)
    this.content = this.content || ''
  }
}

$(function() {
  $('.demo-map').click(function (e) {
    e.preventDefault()
    fetch(this.href).then(res => res.json()).then(initMap).catch(alert)
  })
  $('.upload-map').on('change', function () {
    const reader = new FileReader()
    reader.addEventListener('load', e => {
      initMap(reader.result)
    })
    reader.readAsText(this.files[0])
  })
  $('.paste-map').on('paste', e => {
    e.preventDefault()
    initMap(e.originalEvent.clipboardData.getData('text'))
  }).click(() => this.value = '').parent().click(() => $('.paste-map').focus())
  $('.back-to-intro').click(() => {
    $('.intro').fadeIn(() => $('main>ul').empty())
  })
})

sourceMap.SourceMapConsumer.initialize({
  "lib/mappings.wasm": "https://unpkg.com/source-map@0.7.3/lib/mappings.wasm"
});

async function initMap(text) {
  const map = await new sourceMap.SourceMapConsumer(text)
  map.contents = {}
  for (const file of map.sources) {
    map.contents[file] = map.sourceContentFor(file)
  }
  $('.intro').fadeOut()
  const tree = new Directory('', '~', { root: true })
  for (var path of map.sources) {
    const components = path.split('/')
    let dir = tree
    for (let component of components.slice(0, -1)) {
      if (!dir.children.find(entity => entity.name === component)) {
        dir.children.push(new Directory(component, (dir.root ? '' : dir.path + '/') + component))
      }
      dir = dir.children.find(entity => entity.name === component)
    }
    const filename = components[components.length - 1]
    dir.children.push(new File(filename, path, {
      content: map.contents[path]
    }))
  }
  walkTree(tree, $('main ul'))
  $('[title="' + location.hash.slice(shebang.length) + '"]').click()
}

const icons = {
  file: 'file-text-o',
  dir: 'folder-open-o'
}

function walkTree(tree, $el) {
  for (const child of tree.children) {
    const $li = $('<li />')
      .addClass(child.type)
      .append($('<i />').addClass(`fa fa-fw fa-${icons[child.type]}`))
      .append(' ')
      .append($('<span />').text(child.name))
      .attr('title', child.path)
    $el.append($li)
    switch(child.type) {
      case 'file':
        $li.click(function (e) {
          e.preventDefault();
          e.stopPropagation();
          location.hash = shebang + child.path
          const { language, value: html } = hljs.highlightAuto(child.content)
          $('pre code').html(html).attr('data-language', language)
        })
        break;
      case 'dir':
        const $ul = $('<ul />').appendTo($li)
        const $icon = $li.find('i')
        $li.click(function (e) {
          e.preventDefault();
          e.stopPropagation();
          $icon.toggleClass('fa-folder-open-o').toggleClass('fa-folder-o')
          $ul.slideToggle();
        })
        if (['node_modules'].includes(child.name)) {
          $ul.click()
        }
        walkTree(child, $ul)
        break;
      default:
        // ???
        break;
    }
  }
}
