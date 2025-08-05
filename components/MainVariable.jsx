export async function getServerSideProps() {
    const BaseUrl = process.env.REACT_APP_BASE_URL || '';
    const CustomerToken = process.env.REACT_APP_CUSTOMER_TOKEN || '';
    return {
      props: {
        BaseUrl,
        CustomerToken,
      },
    };
  
  }