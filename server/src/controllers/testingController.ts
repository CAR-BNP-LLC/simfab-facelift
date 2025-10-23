import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { TestingService } from '../services/TestingService';
import { successResponse, errorResponse } from '../utils/response';

export class TestingController {
  private testingService: TestingService;

  constructor(pool: Pool) {
    this.testingService = new TestingService(pool);
  }

  /**
   * Run comprehensive test suite
   */
  runComprehensiveTests = async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log('🧪 Starting comprehensive test suite...');
      const testSuites = await this.testingService.runComprehensiveTests();
      
      // Calculate overall statistics
      const totalTests = testSuites.reduce((sum, suite) => sum + suite.totalTests, 0);
      const totalPassed = testSuites.reduce((sum, suite) => sum + suite.passedTests, 0);
      const totalFailed = testSuites.reduce((sum, suite) => sum + suite.failedTests, 0);
      const totalWarnings = testSuites.reduce((sum, suite) => sum + suite.warningTests, 0);
      const totalDuration = testSuites.reduce((sum, suite) => sum + suite.totalDuration, 0);

      const overallStatus = totalFailed > 0 ? 'critical' : totalWarnings > 0 ? 'warning' : 'healthy';

      console.log(`🧪 Test suite completed: ${totalPassed}/${totalTests} passed, ${totalFailed} failed, ${totalWarnings} warnings`);

      res.json(successResponse({
        message: 'Comprehensive test suite completed',
        overallStatus,
        summary: {
          totalTests,
          totalPassed,
          totalFailed,
          totalWarnings,
          totalDuration,
          successRate: totalTests > 0 ? (totalPassed / totalTests) * 100 : 0
        },
        testSuites
      }));
    } catch (error) {
      console.error('Test suite execution failed:', error);
      next(error);
    }
  };

  /**
   * Run specific test suite
   */
  runSpecificTests = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { suite } = req.params;
      
      if (!suite) {
        return res.status(400).json(errorResponse('Missing suite parameter'));
      }

      let testSuites;
      switch (suite) {
        case 'database':
          testSuites = [await this.testingService['runDatabaseTests']()];
          break;
        case 'payment':
          testSuites = [await this.testingService['runPaymentFlowTests']()];
          break;
        case 'webhook':
          testSuites = [await this.testingService['runWebhookTests']()];
          break;
        case 'stock':
          testSuites = [await this.testingService['runStockReservationTests']()];
          break;
        case 'refund':
          testSuites = [await this.testingService['runRefundTests']()];
          break;
        case 'security':
          testSuites = [await this.testingService['runSecurityTests']()];
          break;
        default:
          return res.status(400).json(errorResponse(`Unknown test suite: ${suite}`));
      }

      res.json(successResponse({
        message: `${suite} test suite completed`,
        testSuites
      }));
    } catch (error) {
      console.error(`${req.params.suite} test suite execution failed:`, error);
      next(error);
    }
  };

  /**
   * Get test history
   */
  getTestHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // This would typically store test results in a database
      // For now, we'll return a mock response
      res.json(successResponse({
        message: 'Test history retrieved',
        history: [
          {
            id: 1,
            timestamp: new Date().toISOString(),
            suite: 'comprehensive',
            status: 'healthy',
            totalTests: 15,
            passedTests: 14,
            failedTests: 0,
            warningTests: 1,
            duration: 1250
          }
        ]
      }));
    } catch (error) {
      next(error);
    }
  };
}
