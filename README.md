# react-router-location-aware-transitions
Power contextual location aware react router transitions

## Getting started

```bash
npm install react-router-location-aware-transitions --save
```

## Example

### Decorating react router Route's
```jsx

import React from 'react'
import { Route } from 'react-router-dom'
import LocationAwareTransitions from 'react-router-location-aware-transitions'
import styles from './styles.scss'

export default class App extends React.Component {
    render() {
        return (
            <div>
                <LocationAwareTransitions.Conductor onLocationWillChange={onLocationWillChange}>
                    <TransitionRoute component={require('./components/a')} path='/a' />
                    <TransitionRoute component={require('./components/b')} path='/b' />
                    <TransitionRoute component={require('./components/c')} path='/c' />
                </LocationAwareTransitions.Conductor>
            </div>
        )
    }
}

function TransitionRoute({ component, path, ...props }) {
    return (
        <Route path={path} {...props} children={childProps =>
          <LocationAwareTransitions.Child {...childProps} path={path} className={styles.transitionChild}>
            {component}
          </LocationAwareTransitions.Child>
        } />
    )
}

TransitionRoute.propTypes = {
    component: PropTypes.any.isRequired,
    path: PropTypes.string
}

function onLocationWillChange(nextProps, currentProps) {
    // optional logic here
    // TODO: add real use-case example for this.
    return true
}
```