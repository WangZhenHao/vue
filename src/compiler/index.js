/* @flow */

import { parse } from './parser/index'
import { optimize } from './optimizer'
import { generate } from './codegen/index'
import { createCompilerCreator } from './create-compiler'

// `createCompilerCreator` allows creating compilers that use alternative
// parser/optimizer/codegen, e.g the SSR optimizing compiler.
// Here we just export a default compiler using the default parts.

/**
 例如：
 template是：
 <div id="app">
    111
    <div>222</div>
    {{ msg }}
    <test>333</test>
    <test>444</test>
  </div>

  变成render是：
  with(this){return _c('div',{attrs:{"id":"app"}},[_v("\n\t\t111\n\t\t"),_c('div',[_v("222")]),_v("\n\t\t"+_s(msg)+"\n\t\t"),_c('test',[_v("333")]),_v(" "),_c('test',[_v("444")])],1)}



 */

 /** 
   createCompilerCreator函数执行之后，返回一个函数，还需要进一步的执行才能的到
   {
      compile,
      compileToFunctions: createCompileToFunctionFn(compile)
   }

  */
export const createCompiler = createCompilerCreator(function baseCompile (
  template: string,
  options: CompilerOptions
): CompiledResult {
  const ast = parse(template.trim(), options)
  if (options.optimize !== false) {
    optimize(ast, options)
  }
  const code = generate(ast, options)
  
  return {
    ast,
    render: code.render,
    staticRenderFns: code.staticRenderFns,
  }
})
