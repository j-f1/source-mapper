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
  $(window).trigger('hashchange')
}

const icons = {
  file: 'file-text-o',
  dir: 'folder-open-o'
}

let lastScrolls = [0, 0]
const $sidebar = $('.sidebar').on('scroll', function () {
  lastScrolls = [this.scrollTop, lastScrolls[0]]
})
$(window).on('hashchange', function (e) {
  const child = $(document.getElementById(location.hash.slice(1))).data('entity')
  const { language, value: html } = hljs.highlight(child.name.slice(child.name.lastIndexOf('.') + 1), child.content)
  $('pre code').html(html).attr('data-language', language)
  $sidebar.scrollTop(lastScrolls[1])
})

function walkTree(tree, $el) {
  for (const child of tree.children) {
    const id = shebang + child.path
    const $li = $('<li />')
      .attr('id', id.slice(1))
      .addClass(child.type)
      .attr('title', child.path)
      .data('entity', child)
      .append($('<a />').attr('href', id)
        .append($('<i />').addClass(`fa fa-fw fa-${icons[child.type]}`))
        .append(' ')
        .append(child.name))
    $el.append($li)
    if (child.type === 'dir') {
      const $ul = $('<ul />').appendTo($li)
      const $icon = $li.find('i')
      $li.children('a').click(function (e) {
        $icon.toggleClass('fa-folder-open-o').toggleClass('fa-folder-o')
        $ul.slideToggle();
      })
      if (['node_modules'].includes(child.name)) {
        $li.children('a').click()
      }
      walkTree(child, $ul)
    }
  }
}
