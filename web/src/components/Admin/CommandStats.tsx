import * as React from "react"
import { useState } from "react"
import {
  Row,
  Col,
  Card,
  Spinner,
  Table,
  Alert,
  Button,
  ButtonGroup,
  ToggleButton,
  Placeholder,
} from "react-bootstrap"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from "chart.js"
import { Bar, Pie, Line } from "react-chartjs-2"
import { useHelpaApi } from "../../hooks/useHelpaApi"
import TimeAgo from "react-timeago"

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
)

interface CommandStatsProps {
  showTopCommands?: number
  showTopUsers?: number
  showTopChannels?: number
  recentActivityPerPage?: number
}

const CommandStats: React.FunctionComponent<CommandStatsProps> = (props) => {
  const [timeRange, setTimeRange] = useState("7d")
  const [recentPage, setRecentPage] = useState(1)
  const showTopCommands = props.showTopCommands || 10
  const showTopUsers = props.showTopUsers || 10
  const showTopChannels = props.showTopChannels || 10
  const recentActivityPerPage = props.recentActivityPerPage || 10

  // Helper function to get CSS variable values
  const getCSSVariable = (variable: string): string => {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(variable)
      .trim()
  }

  // Convert hex to rgba
  const hexToRgba = (hex: string, alpha: number = 1): string => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  // Get platform color with optional alpha
  const getPlatformColor = (platform: string, alpha?: number): string => {
    const cssVar = platform === "discord" ? "--discord-color" : "--twitch-color"
    const color = getCSSVariable(cssVar)
    return alpha !== undefined ? hexToRgba(color, alpha) : color
  }

  const {
    useCommandStatsOverview,
    useTopCommands,
    usePlatformBreakdown,
    useTopUsers,
    useCommandTimeline,
    useRecentCommands,
    useTopChannels,
  } = useHelpaApi()

  // Fetch all data with selected time range
  const { data: overview, isLoading: overviewLoading } =
    useCommandStatsOverview(timeRange)
  const { data: topCommands, isLoading: topCommandsLoading } = useTopCommands(
    showTopCommands,
    timeRange
  )
  const { data: platformBreakdown, isLoading: platformLoading } =
    usePlatformBreakdown(timeRange)
  const { data: topUsers, isLoading: topUsersLoading } = useTopUsers(
    showTopUsers,
    timeRange
  )
  const { data: timeline, isLoading: timelineLoading } = useCommandTimeline(
    timeRange,
    timeRange === "24h" ? "hour" : "day"
  )
  const { data: recentCommands, isLoading: recentCommandsLoading } =
    useRecentCommands(recentPage, recentActivityPerPage)
  const { data: topChannels, isLoading: topChannelsLoading } = useTopChannels(
    showTopChannels,
    timeRange,
    undefined
  )

  const timeRangeOptions = [
    { value: "24h", label: "24 Hours" },
    { value: "7d", label: "7 Days" },
    { value: "30d", label: "30 Days" },
    { value: "90d", label: "90 Days" },
    { value: "all", label: "All Time" },
  ]

  const isLoading =
    overviewLoading ||
    topCommandsLoading ||
    platformLoading ||
    topUsersLoading ||
    timelineLoading ||
    topChannelsLoading

  // Generate gradient colors for bar chart
  const generateBarColors = (count: number): string[] => {
    const colors: string[] = []
    for (let i = 0; i < count; i++) {
      const hue = (i * 360) / count + 250 // Start from purple-ish hue
      colors.push(`hsla(${hue % 360}, 70%, 60%, 0.7)`)
    }
    return colors
  }

  // Prepare data for bar chart
  const barChartData = {
    labels: topCommands?.map((cmd) => cmd.command) || [],
    datasets: [
      {
        label: "Usage Count",
        data: topCommands?.map((cmd) => cmd.count) || [],
        backgroundColor: generateBarColors(topCommands?.length || 0),
        borderColor: generateBarColors(topCommands?.length || 0).map((color) =>
          color.replace("0.7)", "1)")
        ),
        borderWidth: 1,
      },
    ],
  }

  const barChartOptions: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          afterLabel: (context) => {
            const command = topCommands?.[context.dataIndex]
            return command ? `${command.percentage}% of total` : ""
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  }

  // Prepare data for pie chart
  const pieChartData = {
    labels:
      platformBreakdown?.map((p) => {
        if (!p.platform) return "Unknown"
        return p.platform.charAt(0).toUpperCase() + p.platform.slice(1)
      }) || [],
    datasets: [
      {
        data: platformBreakdown?.map((p) => p.count) || [],
        backgroundColor:
          platformBreakdown?.map((p) =>
            getPlatformColor(p.platform || "discord", 0.8)
          ) || [],
        borderColor:
          platformBreakdown?.map((p) =>
            getPlatformColor(p.platform || "discord", 1)
          ) || [],
        borderWidth: 1,
      },
    ],
  }

  const pieChartOptions: ChartOptions<"pie"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const platform = platformBreakdown?.[context.dataIndex]
            if (!platform) return ""
            const percentage = overview?.totalUsage
              ? ((platform.count / overview.totalUsage) * 100).toFixed(1)
              : "0"
            return `${context.label}: ${platform.count} (${percentage}%) - ${platform.uniqueUsers} users, ${platform.uniqueCommands} commands`
          },
        },
      },
    },
  }

  // Prepare data for line chart
  const lineChartData = {
    labels: timeline?.map((t) => t.date) || [],
    datasets: [
      {
        label: "Discord",
        data: timeline?.map((t) => t.discord) || [],
        borderColor: getPlatformColor("discord"),
        backgroundColor: getPlatformColor("discord", 0.1),
        tension: 0.1,
      },
      {
        label: "Twitch",
        data: timeline?.map((t) => t.twitch) || [],
        borderColor: getPlatformColor("twitch"),
        backgroundColor: getPlatformColor("twitch", 0.1),
        tension: 0.1,
      },
      {
        label: "Total",
        data: timeline?.map((t) => t.total) || [],
        borderColor: "rgb(130, 202, 157)",
        backgroundColor: "rgba(130, 202, 157, 0.1)",
        tension: 0.1,
      },
    ],
  }

  const lineChartOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  }

  return (
    <>
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0">
              <i className="fa-solid fa-clock-rotate-left me-2"></i>
              Time Range
            </h5>
            <ButtonGroup>
              {timeRangeOptions.map((option) => (
                <ToggleButton
                  key={option.value}
                  id={`time-${option.value}`}
                  type="radio"
                  variant="outline-primary"
                  name="timeRange"
                  value={option.value}
                  checked={timeRange === option.value}
                  onChange={(e) => setTimeRange(e.currentTarget.value)}
                  className="time-range-pill"
                >
                  {option.label}
                </ToggleButton>
              ))}
            </ButtonGroup>
          </div>
        </Col>
      </Row>

      {isLoading ? (
        <div className="text-center py-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      ) : (
        <>
          {/* Overview Cards */}
          <Row className="mb-4">
            <Col md={3}>
              <Card className="stats-overview-card">
                <Card.Body>
                  <div className="stats-icon">
                    <i className="fa-solid fa-chart-line"></i>
                  </div>
                  <div className="stats-content">
                    <p className="stats-label">TOTAL USAGE</p>
                    <h3 className="stats-value">
                      {overview?.totalUsage.toLocaleString() || 0}
                    </h3>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="stats-overview-card">
                <Card.Body>
                  <div className="stats-icon">
                    <i className="fa-solid fa-users"></i>
                  </div>
                  <div className="stats-content">
                    <p className="stats-label">UNIQUE USERS</p>
                    <h3 className="stats-value">
                      {overview?.uniqueUsers.toLocaleString() || 0}
                    </h3>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="stats-overview-card">
                <Card.Body>
                  <div className="stats-icon">
                    <i className="fa-solid fa-terminal"></i>
                  </div>
                  <div className="stats-content">
                    <p className="stats-label">UNIQUE COMMANDS</p>
                    <h3 className="stats-value">
                      {overview?.uniqueCommands.toLocaleString() || 0}
                    </h3>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="stats-overview-card">
                <Card.Body>
                  <div className="stats-icon">
                    <i className="fa-solid fa-calculator"></i>
                  </div>
                  <div className="stats-content">
                    <p className="stats-label">AVG USES/USER</p>
                    <h3 className="stats-value">
                      {overview && overview.uniqueUsers > 0
                        ? (overview.totalUsage / overview.uniqueUsers).toFixed(
                            1
                          )
                        : 0}
                    </h3>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Recent Activity */}
          <Row className="mb-4">
            <Col>
              <Card>
                <Card.Header>
                  <i className="fa-solid fa-clock-rotate-left pe-1"></i>
                  Recent Activity
                </Card.Header>
                <Card.Body className="p-0">
                  {recentCommandsLoading ? (
                    <Table striped hover responsive size="sm" className="mb-0">
                      <thead>
                        <tr>
                          <th>Time</th>
                          <th>User</th>
                          <th>Community</th>
                          <th>Command</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...Array(recentActivityPerPage)].map((_, index) => (
                          <tr key={`skeleton-${index}`}>
                            <td>
                              <Placeholder as="span" animation="glow">
                                <Placeholder xs={6} />
                              </Placeholder>
                            </td>
                            <td>
                              <Placeholder as="span" animation="glow">
                                <Placeholder xs={8} />
                              </Placeholder>
                            </td>
                            <td>
                              <Placeholder as="span" animation="glow">
                                <Placeholder xs={7} />
                              </Placeholder>
                            </td>
                            <td>
                              <Placeholder as="span" animation="glow">
                                <Placeholder xs={5} />
                              </Placeholder>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  ) : recentCommands && recentCommands.logs.length > 0 ? (
                    <>
                      <Table
                        striped
                        hover
                        responsive
                        size="sm"
                        className="mb-0"
                      >
                        <thead>
                          <tr>
                            <th>Time</th>
                            <th>User</th>
                            <th>Community</th>
                            <th>Command</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentCommands.logs.map((log) => {
                            const community =
                              log.source === "discord"
                                ? (log.metadata?.guild as string)
                                : (log.metadata?.channel as string)?.replace(
                                    "#",
                                    ""
                                  )

                            return (
                              <tr key={log._id}>
                                <td>
                                  <TimeAgo date={log.createdAt} />
                                </td>
                                <td>{log.username}</td>
                                <td>
                                  <i
                                    className={`fa-brands fa-${log.source} me-2`}
                                    style={{
                                      color:
                                        log.source === "discord"
                                          ? "var(--discord-color)"
                                          : "var(--twitch-color)",
                                      fontSize: "1.2em",
                                    }}
                                    title={log.source}
                                  ></i>
                                  {community || "Unknown"}
                                </td>
                                <td>
                                  <code>{log.command}</code>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </Table>
                      {recentCommands.pagination.pages > 1 && (
                        <div className="d-flex justify-content-between align-items-center p-3">
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={recentPage === 1}
                            onClick={() => setRecentPage(recentPage - 1)}
                          >
                            Previous
                          </Button>
                          <span>
                            Page {recentPage} of{" "}
                            {recentCommands.pagination.pages}
                          </span>
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={
                              recentPage >= recentCommands.pagination.pages
                            }
                            onClick={() => setRecentPage(recentPage + 1)}
                          >
                            Next
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <Alert variant="info">No recent activity</Alert>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Top Users Table */}
          <Row className="mb-4">
            <Col>
              <Card>
                <Card.Header>
                  <i className="fa-solid fa-users pe-1"></i>
                  Top Users
                </Card.Header>
                <Card.Body className="p-0">
                  {topUsers && topUsers.length > 0 ? (
                    <Table striped hover responsive className="mb-0">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Username</th>
                          <th>Uses</th>
                          <th>Unique Commands</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topUsers.map((user, index) => (
                          <tr key={index}>
                            <td>{index + 1}</td>
                            <td>
                              <i
                                className={`fa-brands fa-${user.platform} me-2`}
                                style={{
                                  color:
                                    user.platform === "discord"
                                      ? "var(--discord-color)"
                                      : "var(--twitch-color)",
                                  fontSize: "1.2em",
                                }}
                                title={user.platform}
                              ></i>
                              {user.username}
                            </td>
                            <td>{user.count.toLocaleString()}</td>
                            <td>{user.uniqueCommands}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  ) : (
                    <Alert variant="info">No user data available</Alert>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Top Channels/Guilds Row */}
          <Row className="mb-4">
            <Col>
              <Card>
                <Card.Header>
                  <i className="fa-solid fa-hashtag pe-1"></i>
                  Top Communities
                </Card.Header>
                <Card.Body className="p-0">
                  {topChannels && topChannels.length > 0 ? (
                    <Table striped hover responsive className="mb-0">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Channel</th>
                          <th>Commands Used</th>
                          <th>Unique Users</th>
                          <th>Unique Commands</th>
                          <th>Usage %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topChannels.map((channel, index) => (
                          <tr key={index}>
                            <td>{index + 1}</td>
                            <td>
                              <i
                                className={`fa-brands fa-${channel.platform} me-2`}
                                style={{
                                  color:
                                    channel.platform === "discord"
                                      ? "var(--discord-color)"
                                      : "var(--twitch-color)",
                                  fontSize: "1.2em",
                                }}
                                title={channel.platform}
                              ></i>
                              {channel.channel || "Unknown"}
                            </td>
                            <td>{channel.count.toLocaleString()}</td>
                            <td>{channel.uniqueUsers}</td>
                            <td>{channel.uniqueCommands}</td>
                            <td>{channel.percentage}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  ) : (
                    <Alert variant="info">No channel data available</Alert>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Charts Row */}
          <Row className="mb-4">
            {/* Top Commands Bar Chart */}
            <Col>
              <Card>
                <Card.Header>
                  <i className="fa-solid fa-chart-bar pe-1"></i>
                  Top Commands
                </Card.Header>
                <Card.Body>
                  {topCommands && topCommands.length > 0 ? (
                    <div style={{ height: "300px" }}>
                      <Bar data={barChartData} options={barChartOptions} />
                    </div>
                  ) : (
                    <Alert variant="info">No command data available</Alert>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Timeline Chart */}
          <Row className="mb-4">
            <Col lg={8}>
              <Card>
                <Card.Header>
                  <i className="fa-solid fa-chart-line pe-1"></i>
                  Usage Timeline
                </Card.Header>
                <Card.Body>
                  {timeline && timeline.length > 0 ? (
                    <div style={{ height: "300px" }}>
                      <Line data={lineChartData} options={lineChartOptions} />
                    </div>
                  ) : (
                    <Alert variant="info">No timeline data available</Alert>
                  )}
                </Card.Body>
              </Card>
            </Col>
            {/* Platform Pie Chart */}
            <Col lg={4}>
              <Card>
                <Card.Header>
                  <i className="fa-solid fa-chart-pie pe-1"></i>
                  Platform Breakdown
                </Card.Header>
                <Card.Body>
                  {platformBreakdown && platformBreakdown.length > 0 ? (
                    <div style={{ height: "300px" }}>
                      <Pie data={pieChartData} options={pieChartOptions} />
                    </div>
                  ) : (
                    <Alert variant="info">No platform data available</Alert>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </>
  )
}

export default CommandStats
