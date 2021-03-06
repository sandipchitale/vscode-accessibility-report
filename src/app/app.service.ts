import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AppService {
  vscode: any;
  // tslint:disable-next-line: variable-name
  _message = new Subject();

  constructor() {
    // tslint:disable-next-line: no-string-literal
    this.vscode = window['acquireVsCodeApi']();

    window.addEventListener('message', event => {
      const message = event.data; // The JSON data our extension sent
      this._message.next(message);
    });
  }

  get message() {
    return this._message.asObservable();
  }

  launch(url: string) {
    this.vscode.postMessage({
        command: 'launch',
        url
    });
  }

  runAxe() {
    this.vscode.postMessage({
        command: 'runAxe'
    });
  }
}
