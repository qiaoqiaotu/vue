/* @flow */

import {
  tip,
  toArray,
  hyphenate,
  formatComponentName,
  invokeWithErrorHandling,
} from "../util/index";
import { updateListeners } from "../vdom/helpers/index";

export function initEvents(vm: Component) {
  vm._events = Object.create(null);
  vm._hasHookEvent = false;
  // init parent attached events
  const listeners = vm.$options._parentListeners;
  if (listeners) {
    updateComponentListeners(vm, listeners);
  }
}

let target: any;

function add(event, fn) {
  target.$on(event, fn);
}

function remove(event, fn) {
  target.$off(event, fn);
}

function createOnceHandler(event, fn) {
  const _target = target;
  return function onceHandler() {
    const res = fn.apply(null, arguments);
    if (res !== null) {
      _target.$off(event, onceHandler);
    }
  };
}

export function updateComponentListeners(
  vm: Component,
  listeners: Object,
  oldListeners: ?Object
) {
  target = vm;
  updateListeners(
    listeners,
    oldListeners || {},
    add,
    remove,
    createOnceHandler,
    vm
  );
  target = undefined;
}

export function eventsMixin(Vue: Class<Component>) {
  // TODO: 这个 hookRE 不知道什么作用
  const hookRE = /^hook:/;
  /**
   * 监听事件
   * @param {*} event 事件类型
   * @param {*} fn 函数
   */
  Vue.prototype.$on = function (
    event: string | Array<string>,
    fn: Function
  ): Component {
    const vm: Component = this;
    // 当 event 为一个数组时，遍历数组将 fn 依次添加到对应的 事件数组中去
    if (Array.isArray(event)) {
      for (let i = 0, l = event.length; i < l; i++) {
        vm.$on(event[i], fn);
      }
    } else {
      // events 为字符串 push fn
      (vm._events[event] || (vm._events[event] = [])).push(fn);
      // optimize hook:event cost by using a boolean flag marked at registration
      // instead of a hash lookup
      if (hookRE.test(event)) {
        vm._hasHookEvent = true;
      }
    }
    return vm;
  };

  /**
   * 对 event 类型的事件的 进行一次监听，执行 fn 函数
   * @param {*} event 事件名称 | 事件数组
   * @param {*} fn 函数
   */
  Vue.prototype.$once = function (event: string, fn: Function): Component {
    const vm: Component = this;
    function on() {
      vm.$off(event, on);
      fn.apply(vm, arguments);
    }
    on.fn = fn;
    vm.$on(event, on);
    return vm;
  };

  /**
   * 取消订阅
   * @param {*} event 事件名称
   * @param {*} fn 函数
   */
  Vue.prototype.$off = function (
    event?: string | Array<string>,
    fn?: Function
  ): Component {
    const vm: Component = this;
    // all  event 和 fn 都不传，直接将 _events 置空
    if (!arguments.length) {
      vm._events = Object.create(null);
      return vm;
    }
    // array of events  如果 events 是数组，将其对应的依次将各个事件 off
    if (Array.isArray(event)) {
      for (let i = 0, l = event.length; i < l; i++) {
        vm.$off(event[i], fn);
      }
      return vm;
    }
    // specific event event 是具体的时间名称 cbs 为事件数组
    const cbs = vm._events[event];
    // cbs 不存在 直接返回 this
    if (!cbs) {
      return vm;
    }
    // fn 没传，将对应的置空
    if (!fn) {
      vm._events[event] = null;
      return vm;
    }
    // cbs 事件数组 存在
    // specific handler
    let cb;
    let i = cbs.length;
    while (i--) {
      cb = cbs[i];
      if (cb === fn || cb.fn === fn) {
        cbs.splice(i, 1);
        break;
      }
    }
    return vm;
  };

  /**
   * 触发事件
   * @param {*} event 事件名称
   */
  Vue.prototype.$emit = function (event: string): Component {
    const vm: Component = this;
    if (process.env.NODE_ENV !== "production") {
      const lowerCaseEvent = event.toLowerCase();
      if (lowerCaseEvent !== event && vm._events[lowerCaseEvent]) {
        tip(
          `Event "${lowerCaseEvent}" is emitted in component ` +
            `${formatComponentName(
              vm
            )} but the handler is registered for "${event}". ` +
            `Note that HTML attributes are case-insensitive and you cannot use ` +
            `v-on to listen to camelCase events when using in-DOM templates. ` +
            `You should probably use "${hyphenate(
              event
            )}" instead of "${event}".`
        );
      }
    }
    let cbs = vm._events[event]; // 获取 event 的事件数组
    if (cbs) {
      cbs = cbs.length > 1 ? toArray(cbs) : cbs;
      const args = toArray(arguments, 1);
      const info = `event handler for "${event}"`;
      for (let i = 0, l = cbs.length; i < l; i++) {
        invokeWithErrorHandling(cbs[i], vm, args, vm, info);
      }
    }
    return vm;
  };
}
