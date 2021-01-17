import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { AppService } from './app.service';

interface Report {
  timestamp: string;
  url: string;
  violations: any;
  passes: any;
  inapplicable: any;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  url = 'https://start.spring.io';

  reports: Report[] = [];
  selectedReport: Report;

  violations = '';

  constructor(
    private translate: TranslateService,
    private appService: AppService
    ) {
    this.translate.setDefaultLang('en');

    this.appService.message.subscribe((message: any) => {
      switch (message.command) {
      case 'report':
        const report: Report = {
          timestamp: message.axeResults.timestamp,
          url: message.axeResults.url,
          violations: message.axeResults.violations,
          passes: message.axeResults.passes || [],
          inapplicable: message.axeResults.inapplicable || []
        };
        this.selectedReport = report;
        this.violations = JSON.stringify(this.selectedReport.violations, null, '  ');
        this.reports.push(report);
        break;
      }
    });
  }

  onReportSelected(event: { data: Report; }) {
    this.violations = JSON.stringify(event.data.violations, null, '  ');
  }

  onReportUnselected() {
    this.violations = '';
  }

  launch() {
    this.appService.launch(this.url);
  }

  runAxe() {
    this.appService.runAxe();
  }

}
