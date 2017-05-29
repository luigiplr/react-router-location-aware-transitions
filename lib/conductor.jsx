import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { autobind } from 'core-decorators'
import { withRouter } from 'react-router-dom'
import { Observable } from 'rxjs/Observable'
import { Subject } from 'rxjs/Subject'
import { zip } from 'rxjs/observable/zip'
import { mergeMap } from 'rxjs/operator/mergeMap'
import { switchMap } from 'rxjs/operator/switchMap'
import R from 'ramda'

@withRouter
export default class Conductor extends Component {
  static propTypes = {
    children: PropTypes.any.isRequired,
    location: PropTypes.object.isRequired,
    history: PropTypes.object.isRequired,
    onLocationWillChange: PropTypes.func
  }

  static defaultProps = {
    onLocationWillChange: R.T
  }

  static childContextTypes = {
    registerTransitionChild: PropTypes.func.isRequired
  }

  _routeObservables = {}
  _leavingRoute = null
  _enteringRoute = null

  getChildContext() {
    return {
      registerTransitionChild: this._handleNewChildRoute
    }
  }

  componentWillMount() {
    this.props.onLocationWillChange(this.props.children, this.props.location.pathname, this.props.history)
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.location === this.props.location || !this.props.onLocationWillChange(this.props.children, this.props.location.pathname, this.props.history)) {
      return
    }

    this._prevLocation = this.props.location
  }

  componentDidMount() {
    this._prevLocation = this.props.location
    this.transition$ = new Subject()

    this.transition$::switchMap($sequence => $sequence)
      .subscribe(() => {
        delete this._routeObservables[this._leavingRoute]
        this._leavingRoute = this._enteringRoute = null
      }, (err) => {
        // TODO: Enhance this
        console.error('TRANSITION ERROR', err)
      })
  }

  @autobind
  _handleNewChildRoute(route, $child) {
    this._routeObservables[route] = $child

    let totalChildRoutes = Object.keys(this._routeObservables).length

    // we only have one route, this is first render
    if (totalChildRoutes === 1) {
      return
    }

    // we have transitioned before our route predecessor has transitioned fully out
    if (totalChildRoutes > 2) {
      /*
      const routesToDestroy = pickBy(this._routeObservables, (subject, route) =>
        route !== this._leavingRoute && route !== this._enteringRoute
      )
      */

      // TODO:
      // unsubscribe to teardown child animation sequences; signal child Subject to unmount children.
      console.error('WE HAVE MORE THAN TWO CHILDREN?!?!?!?!?!?! logic needs to be made to handle this.')

      totalChildRoutes = Object.keys(this._routeObservables).length
    }

    if (totalChildRoutes === 2) {
      const { _routeObservables } = this

      for (let id in _routeObservables) {
        this[id === route ? '_enteringRoute' : '_leavingRoute'] = id
      }

      // hardcoded for now
      const transitionMode = 'out-in'
      const {
        [this._enteringRoute]: $enteringComponent,
        [this._leavingRoute]: $leavingComponent
      } = this._routeObservables

      switch (transitionMode) {
        case 'in-out':
          this.transition$.next(
            $enteringComponent()
              ::mergeMap(({componentEnter}) => componentEnter(this._prevLocation))
              ::mergeMap(() => $leavingComponent())
              ::mergeMap(({componentLeave, render}) =>
                componentLeave(this.props.location)
                  ::mergeMap(() => render(false))
              )
          )
          break
        case 'out-in':
          this.transition$.next(
            $leavingComponent()
              ::mergeMap(leavingComponent =>
                leavingComponent.componentLeave(this.props.location)
                  ::mergeMap(() =>
                    $enteringComponent()
                      ::mergeMap(({componentEnter}) =>
                        componentEnter(this._prevLocation)
                      )
                  )
                  ::mergeMap(() =>
                    leavingComponent.render(false)
                  )
              )
          )
          break
        case 'simultaneous':
          this.transition$.next(
            Observable::zip($enteringComponent, $leavingComponent)
              ::mergeMap(([enteringComponent, leavingComponent]) =>
                Observable::zip(
                  enteringComponent.componentEnter(this._prevLocation),
                  leavingComponent.componentLeave(this.props.location)
                    ::mergeMap(() => leavingComponent.render(false))
                )
              )
          )
          break
      }
    }
  }

  render() {
    return (
      <div>
        {this.props.children}
      </div>
    )
  }
}
