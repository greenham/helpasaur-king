import { TestEventPayload } from "@helpasaur/types"
import { ApiBase } from "../base"
import { ROUTES } from "../constants"

/**
 * API routes for stream management
 * Handles live stream data and monitoring
 */
export class TestEventsRoutes extends ApiBase {
  /**
   * Trigger a test event for development/testing purposes
   */
  async triggerTestEvent(payload: TestEventPayload): Promise<void> {
    return await this.api.post(`${ROUTES.TEST_EVENTS}/trigger`, payload)
  }
}
