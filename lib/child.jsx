import React, { Component } from 'react'
import PropTypes from 'prop-types'
import raf from 'raf'
import { autobind, lazyInitialize } from 'core-decorators'
import { Observable } from 'rxjs/Observable'
import { BehaviorSubject } from 'rxjs/BehaviorSubject'
import { map } from 'rxjs/operator/map'
import { bindCallback } from 'rxjs/observable/bindCallback'
import { first } from 'rxjs/operator/first'
import { skip } from 'rxjs/operator/skip'
import { mergeMap } from 'rxjs/operator/mergeMap'
import { mapComponent } from './helpers'

export default class Child extends Component {
  static propTypes = {
    match: PropTypes.object,
    path: PropTypes.string,
    children: PropTypes.any.isRequired,
    location: PropTypes.object.isRequired,
    className: PropTypes.string,
    async: PropTypes.bool
  }

  static defaultProps = {
    async: false
  }

  static contextTypes = {
    registerTransitionChild: PropTypes.func.isRequired
  }

  static childContextTypes = {
    transitionAppear: PropTypes.bool.isRequired
  }

  getChildContext() {
    return {
      transitionAppear: this.state.transitionAppear
    }
  }

  state = (() => {
    const match = Boolean(this.props.match)

    return {
      renderComponent: match,
      transitionAppear: match
    }
  })()

  // SSR env's will never need these
  @lazyInitialize
  _asyncRef$ = new BehaviorSubject()

  @lazyInitialize
  _render$ = Observable::bindCallback(
    (renderComponent, cb) => this.setState({renderComponent}, cb)
  )

  componentDidMount() {
    if (this.state.renderComponent) {
      this.context.registerTransitionChild(this.props.path, this._childComponent$)
    }
  }

  componentWillReceiveProps(nextProps) {
    const { renderComponent, transitionAppear } = this.state

    if (!nextProps.match && renderComponent && transitionAppear) {
      this.setState({ transitionAppear: false })
    } else if (nextProps.match && !renderComponent) {
      this.context.registerTransitionChild(this.props.path, this._childComponent$)
    }
  }

  shouldComponentUpdate(nextProps, nextState) {
    return (
      nextState.renderComponent !== this.state.renderComponent ||
      nextProps.className !== this.props.className
    )
  }

  @autobind
  _childComponent$() {
    const componentMapper = mapComponent(this._render$, this._toggleFront$)
    const { renderComponent } = this.state
    const { async } = this.props

    if (!async && renderComponent) {
      return componentMapper(this._childRef)
    }

    const componentLoad$ = () => async
      ? this._asyncRef$::skip(+!this._asyncRef$.getValue())::map(componentMapper)
      : componentMapper(this._childRef)

    if (renderComponent) {
      return componentLoad$()
    }

    return _render$(true)::mergeMap(componentLoad$)
  }

  _toggleFront$ = isFront => Observable::bindCallback(raf)::map(() =>
    this.refs.child.style.zIndex = +isFront
  )

  _handleAsyncRef = ref => this._asyncRef$.next(ref)

  _handleRef = ref => this._childRef = ref

  render() {
    if (!this.state.renderComponent) {
      return null
    }

    const { children: Component, className, async, ...props } = this.props

    return (
      <div ref='child' style={{zIndex: +this.state.transitionAppear}} className={className}>
        <Component ref={!async && this._handleRef} asyncRef={async && this._handleAsyncRef} {...props} />
      </div>
    )
  }
}
