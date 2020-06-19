##### 在Vue开发的时候，data初始化一个对象没有定义任何属性，经过变量赋值的之后，不需要$set方法，该对象下面的属性就也能变成响应式属性

> 问题

替换方式新增属性： 
![1592491325\(1\).jpg](/img/bVbIxTI)

能够看到赋值的方式的两个属性被Vue处理成响应式，都有了get,set修饰符

赋值方式新增属性：

可以test3, test4没有get,set修饰符

这就导致了修改test1,test2的属性可以触发视图的更新，而修改test3, test4的属性没有触发视图的更新

接下来看看Vue的内部是怎么处理的：

```
 <script>
    let vm = new Vue({
      el: '#app',
      data: {
        form: {},
      },
      mounted() {
        this.form = {
          test1: 1,
          test2: 2
        }

        this.form.test3 = 3
        this.form.test4 = 4

        console.log(this.form)
      }
    })
  </script>
```

以上代码为例:

1：vue在初始化的时候，对data定义的属性就行递归响应式处理，由于只定义form,所以form就有了get,set修饰符（这一点很重要）

2：一系列初始化之后，就开始走虚拟vnode的patch，由于form是一个空对象，{{ form.test1 }} {{ form.test2 }} 都是undidfined,最中页面显示空白

3：页面渲染完成之后，执行mounted构子，直接对form进行复制
```
this.form = { test1: 1, test: 2 }
console.log(this.form)
```

可以看到test1, test2都用了get，和set修饰符,现在来看看vue是怎么做的
```
export function defineReactive (
  obj: Object,
  key: string,
  val: any,
  customSetter?: ?Function,
  shallow?: boolean
) {
  const dep = new Dep()
  const property = Object.getOwnPropertyDescriptor(obj, key)
  if (property && property.configurable === false) {
    return
  }

  // cater for pre-defined getter/setters
  const getter = property && property.get
  const setter = property && property.set
  if ((!getter || setter) && arguments.length === 2) {
    val = obj[key]
  }
  
  let childOb = !shallow && observe(val)
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter () {
      console.log(obj, key)
      const value = getter ? getter.call(obj) : val
      if (Dep.target) {
        dep.depend()
        if (childOb) {
          childOb.dep.depend()
          if (Array.isArray(value)) {
            dependArray(value)
          }
        }
      }
      return value
    },
    set: function reactiveSetter (newVal) {

      const value = getter ? getter.call(obj) : val
      /* eslint-disable no-self-compare */
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return
      }
      /* eslint-enable no-self-compare */
      if (process.env.NODE_ENV !== 'production' && customSetter) {
        customSetter()
      }
      // #7981: for accessor properties without setter
      if (getter && !setter) return
      if (setter) {
        setter.call(obj, newVal)
      } else {
        val = newVal
      }
      childOb = !shallow && observe(newVal)
      dep.notify()
    }
  })
}

```

当赋值给this.form的时候，实际上触发了set修饰符，然后执行里面的函数，看到childOb = !shallow && observe(newVal),newVal就是新的赋值，看看observe方法
```
export function observe (value: any, asRootData: ?boolean): Observer | void {
  if (!isObject(value) || value instanceof VNode) {
    return
  }
  let ob: Observer | void
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    ob = value.__ob__
  } else if (
    shouldObserve &&
    !isServerRendering() &&
    (Array.isArray(value) || isPlainObject(value)) &&
    Object.isExtensible(value) &&
    !value._isVue
  ) {
    ob = new Observer(value)
  }
  if (asRootData && ob) {
    ob.vmCount++
  }
  return ob
}
```

observe函数主要是为了执行new Obsever，该构造函数就是添加响应式对象的核心函数
到这里就可以明白了,在执行this.form的赋值操作，触发了set函数，拿到的newVal是最新的值，然后执行childOb  = childOb = !shallow && observe(newVal),为最新的newVal重新定义定义get,set修饰符，明白了赋值操作如果给新的属性定义set，get修饰符的时候

接下来就是执行dep.notify()了，该方法就是通知Vue可以更新视图了

在更新视图的时候，就会解析 {{ form.test1 }} {{ form.test2 }},触发了test1和test2的get函数，这时候
test1,test2就可以搜集到渲染watch函数
```
Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter () {
      const value = getter ? getter.call(obj) : val
      if (Dep.target) {
        dep.depend()
        if (childOb) {
          childOb.dep.depend()
          if (Array.isArray(value)) {
            dependArray(value)
          }
        }
      }
      return value
    }
})
```
这时候test1, test2收集了该渲染watch函数，在对test1,test2赋值的时候，他们也有了更新视图的能力

接下来看这个情况

```
 let vm = new Vue({
  el: '#app',
  data: {
    form: {},
  },
  mounted() {
    this.form = {
      test1: 1,
      test2: 2,
    }
   
    
    setTimeout(() => {
      this.form.test3 = 3
      this.form.test4 = 4
    }, 3000)
    

  }
})
```

三秒之后，新增test3, test4属性，可以看到这两个属性是没有get,set修饰符的应为没有机制能够知道对象的新增和删除
所有他们无法定义get，set修饰符，test3, test4并没有更新视图的能力

再看一个情况

```
 let vm = new Vue({
  el: '#app',
  data: {
    form: {},
  },
  mounted() {
    this.form = {
      test1: 1,
      test2: 2,
    }

    this.form.test3 = '3'
    
    setTimeout(() => {
      this.form.test4 = 4
    }, 3000)
    

  }
})

```
能够看到

数组时怎么监听自身的改变的呢

```
const arrayProto = Array.prototype
export const arrayMethods = Object.create(arrayProto)

const methodsToPatch = [
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse'
]

/**
 * Intercept mutating methods and emit events
 */
methodsToPatch.forEach(function (method) {
  // cache original method
  const original = arrayProto[method]
  def(arrayMethods, method, function mutator (...args) {
    const result = original.apply(this, args)
    const ob = this.__ob__
    let inserted
    switch (method) {
      case 'push':
      case 'unshift':
        inserted = args
        break
      case 'splice':
        inserted = args.slice(2)
        break
    }
    if (inserted) ob.observeArray(inserted)
    // notify change
    ob.dep.notify()
    return result
  })
})
```

原来数组是重载了push,pop,shift,unshfit,sort,reverse方法，每当数组改变的时候，能够添加响应式属性，这就是对象和数组的区别