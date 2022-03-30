class TradingViewChart extends React.Component {
    constructor(props) {
        super(props)
        this.getLocale = this.getLocale.bind(this)
        this.expandChart= this.expandChart.bind(this)
        this.collapseChart = this.collapseChart.bind(this)
        this.state = {
            chartExpanded: false
        }
    }

    getLocale(locale) {
        switch (locale) {
            case'zh-CN':
                return 'zh'
            case 'zh-HK':
                return 'zh_TW'
            default:
                return 'en'
        }
    }

    expandChart() {
        this.setState({chartExpanded: true})
    }

    collapseChart() {
        this.setState({chartExpanded: false})
    }

    componentDidMount() {
        new TradingView.widget({
            container_id: 'tradingview_mobile_chart_container',
            symbol: this.props.market.name,
            ticker: this.props.market.id,
            datafeed: new (window.Datafeeds.UDFCompatibleDatafeed)('/api/v2/tradingview'),
            library_path: '/tradingview/charting_library/',
            locale: this.getLocale(this.props.locale),
            timezone: 'Asia/Hong_Kong',
            theme: 'light',
            autosize: true,
            custom_css_url: '/tradingview/tradingview_chart.css',
            favorites: {
                intervals: ["1", "5", "60", "D"]
            },
            // for reference on featuresets please refer to
            // http://tradingview.github.io/featuresets.html
            disabled_features: [
                    "edit_buttons_in_legend",
                    "header_settings",
                    "header_undo_redo",
                    "header_symbol_search",
                    "header_compare",
                    "compare_symbol",
                    "header_indicators",
                    "header_screenshot",
                    "left_toolbar",
                    "timeframes_toolbar",
                    "property_pages"
            ]
        })
        const fitChartContainer = () => { $('#tradingview_mobile_chart_container').css('height', () => {
                let height = document.documentElement.clientHeight - 280
                if (height < 250){ height = 250 }
                return height
        }
        )}
        fitChartContainer()
    }

    render() {
        const chartExpanded = this.state.chartExpanded

        return (
            <div
                className={chartExpanded ?
                    'tradingview-parent-container expanded' : 'tradingview-parent-container'}
                style={{display: this.props.display}}>
                {
                    chartExpanded ?
                        <span
                            className="glyphicon glyphicon-remove close-chart-button"
                            onClick={() => this.collapseChart()}
                        />
                        :
                        <svg
                            className='expand-chart-button'
                            onClick={() => this.expandChart()}
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 28 28" width="28" height="28">
                            <g fill="rgb(76, 82, 94)"><path d="M21 7v4h1V6h-5v1z"></path><path d="M16.854 11.854l5-5-.708-.708-5 5zM7 7v4H6V6h5v1z"></path><path d="M11.146 11.854l-5-5 .708-.708 5 5zM21 21v-4h1v5h-5v-1z"></path><path d="M16.854 16.146l5 5-.708.708-5-5z"></path><g><path d="M7 21v-4H6v5h5v-1z"></path><path d="M11.146 16.146l-5 5 .708.708 5-5z"></path></g></g>
                        </svg>
                }
                <div id="tradingview_mobile_chart_container"
                     className={chartExpanded ?
                         'expanded' : ''}>
                    <div id="tradingview_chart" />
                </div>
            </div>
        )
    }
}