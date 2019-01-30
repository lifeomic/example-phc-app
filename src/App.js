import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import _ from 'lodash';
import { LOAuth } from '@lifeomic/app-tools';

const appAuth = new LOAuth({
  clientId: '71svpm9rgu22breagjrk0eh1c4',
  authorizationUri: 'https://lifeomic-prod-us.auth.us-east-2.amazoncognito.com/oauth2/authorize',
  accessTokenUri: 'https://lifeomic-prod-us.auth.us-east-2.amazoncognito.com/oauth2/token',
  redirectUri: 'http://localhost:3000/callback',
  logoutUri: 'https://lifeomic-prod-us.auth.us-east-2.amazoncognito.com/logout',
  logoutRedirectUri: 'http://localhost:3000/logout',
  scopes: ['openid']
});

const resourceType = 'Patient';
function getFhirSearchURL (resourceType, account, project) {
  const projectTag = encodeURIComponent(`http://lifeomic.com/fhir/dataset|${project}`);
  return `https://fhir.us.lifeomic.com/${account}/dstu3/${resourceType}?_tag=${projectTag}&pageSize=5`;
};

class App extends Component {
  constructor () {
    super();
    this.state = {
      patients: [],
      authenticated: false,
      account: '',
      project: ''
    };
    this.loadData = this.loadData.bind(this);
    this.handleAccountChange = this.handleChange.bind(this, 'account');
    this.handleProjectChange = this.handleChange.bind(this, 'project');
  }

  async loadData (e) {
    e.preventDefault();

    const patientsRequest = await appAuth.sign({
      method: 'GET',
      url: getFhirSearchURL(resourceType, this.state.account, this.state.project)
    });
    try {
      const patientsResponse = await fetch(patientsRequest.url, patientsRequest);
      const responseData = await patientsResponse.json();
      this.setState({ patients: _.map(responseData.entry, entry => entry.resource) });
      if (!this.state.patients.length) {
        const issueMessage = _.get(responseData, 'issue[0].details.text');
        if (issueMessage) {
          throw new Error(issueMessage);
        }
      }
      this.setState({ error: '' });
    } catch (error) {
      this.setState({ error: error.message });
    }
  }

  getName = (patient) => {
    const given = _.get(patient, 'name[0].given');
    const family = _.get(patient, 'name[0].family');
    const display = _.get(patient, 'name[0].display');

    if (given && family) {
      return `${given} ${family}`;
    }

    return display || '';
  };

  async logout() {
    return appAuth.logout();
  }

  handleChange(key, event) {
    this.setState({ [key]: event.target.value });
  }

  render() {
    if (!this.state.authenticated) {
      appAuth.startAutomaticTokenRefresh().then(() => {
        this.setState({ authenticated: true });
      });
      return (
        <span>Loading...</span>
      );
    }
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h1 className="App-title">My Custom PHC App</h1>
        </header>
        <div>
          <a onClick={this.logout}>
            Logout
          </a>
        </div>
        <div style={{ padding: '50px' }}>
          <form onSubmit={this.loadData}>
            <label>
              Account: <input type="text" value={this.state.account} onChange={this.handleAccountChange} />
            </label>
            <label>
              Project: <input type="text" value={this.state.project} onChange={this.handleProjectChange} />
            </label>
            <input type="submit" value="Fetch Patients" className="submit" />
          </form>
          <table>
            <tbody>
              {this.state.error &&
                <tr key={this.state.error}>
                  <td>{this.state.error}</td>
                </tr>
              }
              {this.state.patients && this.state.patients.map(patient => {
                return (
                  <tr key={patient.id}>
                    <td>{this.getName(patient)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
}

export default App;
