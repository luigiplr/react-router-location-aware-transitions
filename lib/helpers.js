import { mergeMap } from 'rxjs/operator/mergeMap'
import R from 'ramda'

const getWrappedInstance = c => c.getWrappedInstance ? c.getWrappedInstance() : c

const bindToSelfDefault = (component, method) => component[method]
  ? component[method].bind(component)
  : Promise.resolve

const toggleFrontMergedCycle = (toggleFront, front, $lifeCycleMethod) =>
  (...args) => toggleFront(front)::mergeMap(() => $lifeCycleMethod(...args))

export const mapComponent = (render, toggleFront) => component => {
  const $lifeCycleMethod = R.curry(toggleFrontMergedCycle)(toggleFront)
  const componentMapper = R.curry(bindToSelfDefault)(getWrappedInstance(component))

  return {
    componentEnter: $lifeCycleMethod(true, componentMapper('componentEnter')),
    componentLeave: $lifeCycleMethod(false, componentMapper('componentLeave')),
    render
  }
}
