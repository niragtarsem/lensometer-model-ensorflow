import React, { useEffect, useState } from 'react';
import '@/styles/mobile_style.css'
// import '@/styles/report.css'
import Dynmictitle from '@/components/title';
import Logo from '@/components/logo'
import axios from 'axios';
import { Form, Input, Button } from 'antd';
import Swal from 'sweetalert2';
import { useRouter } from 'next/router';
import { isMobile } from 'react-device-detect';
import { Spin } from 'antd';
const ReportSection = () => {
  const [form] = Form.useForm();
  const router = useRouter();
  const [ReportData, setReportData] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => { 
    if (isMobile==false) {
      router.push(`/`);
    }else{
      setLoading(true);
      const fetchData = async () => {
        try {
          var Business_Url = localStorage.getItem('BusinessBaseurl');
          const authToken = localStorage.getItem('business_access_token');
          const result = await axios.get(`${Business_Url}/genrate-report/`, {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          });
          if(result.data.status==200){
            console.log(result.data.data,'here>>>>>')
            setLoading(false);
            setReportData(result.data.data)
          }else if(result.data.status==400){
            Swal.fire({
              title: '<span class="custom-title">Instruction</span>',
              text: 'Your camera or eyeglass is not clear please clean it and test again.',
              timer: 5000,
              timerProgressBar: true,
              allowOutsideClick: false,
              showConfirmButton: false, // Hide the OK button
            }).then(() => {
              localStorage.removeItem('business_access_token');
              localStorage.removeItem('business_access_refresh');
              router.push('/login/')
            });
          }
          
  
          
        } catch (error) {
          if(error.response && error.response.status==500){
            Swal.fire({
              title: '<span class="custom-title">Instruction</span>',
              text: 'Your camera or eyeglass is not clear please clean it and test again.',
              timer: 5000,
              timerProgressBar: true,
              allowOutsideClick: false,
              showConfirmButton: false, // Hide the OK button
            }).then(() => {
              localStorage.removeItem('business_access_token');
              localStorage.removeItem('business_access_refresh');
              router.push('/login/')
            });
          }
        }
      };
  
      fetchData();
    }
  }, []);
  const onFinish = (values) => {
    const authToken = localStorage.getItem("business_access_token");
     const Business_Url = localStorage.getItem("BusinessBaseurl");
     axios
         .post(`${Business_Url}/user-feedback-api/`, values, {
             headers: {
                 Authorization: `Bearer ${authToken}`,
             },
         })
         .then((response) => {
            if(response.data.status==200){
              console.log('here,add>>>>>>>>>>>.')
             Swal.fire({
               title: 'Success!',
               text: response.data.message,
               icon: 'success',
               confirmButtonText: 'OK',
             }).then((result) => {
               if(result.isConfirmed){
                // Remove items from localStorage
                localStorage.removeItem('business_access_token');
                localStorage.removeItem('business_access_refresh');
                router.push(`/login/`)
                 form.resetFields();
               }
             });
            }
         })
         .catch((error) => {
          console.log(error,'keeeeeeeee')
             
         });
};
  return (
    <section className="step-wrapper">
            <div className="inner-div">
            <Dynmictitle title="report"/>
            <Logo/>
            {loading ? (
            <div> <Spin spinning={loading} tip="Loading..."/></div>
        ) : ( 
                <div className="outer-step-wrap">
                    <div className="bottomwrap">
                        <div className="hdngwrap">
                            <h5>Patient's Report</h5>
                        </div>
                        <div className="detail-wrap">
                            <p className="mb-3 detail-text">Patient's Details</p>
                            <div className="upper-wrap mb-3">
                                <p className="mb-0"><b>Full Name</b></p>
                                {/* <p className="mb-0"><b className="d-block text-end">Age</b></p> */}
                            </div>
                            <div className="upper-wrap">
                                <p className="mb-0">{ReportData.full_name ? ReportData.full_name : 'N/A'}</p>
                                {/* <p className="mb-0 text-end">23</p> */}
                            </div>
                        </div>
                       
                        <div className="detail-wrap mt-4">
                            <p className="desc-text">Cyl Report</p>
                            <div className="upper-wrap mb-3">
                                <p className="mb-0"><b>Left</b></p>
                                <p className="mb-0"><b>Right</b></p>
                                <p className="mb-0"><b>Left Axis</b></p>
                                <p className="mb-0"><b>Right Axis</b></p>
                            </div>
                            <div className="upper-wrap">
                        <p className="mb-0">{ReportData && ReportData.cyl.left !== null ? ReportData.cyl.left : "N/A"}</p>
                        <p className="mb-0">{ReportData && ReportData.cyl.right !== null ? ReportData.cyl.right : "N/A"}</p>
                        <p className="mb-0">{ReportData && ReportData.left_axis !== "" && ReportData.left_axis !== null ? ReportData.left_axis : "0"}</p>
                        <p className="mb-0">{ReportData && ReportData.right_axis !== "" && ReportData.right_axis !== null ? ReportData.right_axis : "0"}</p>
                        </div>
                        </div>
                        <div className="detail-wrap mt-4">
                            <p className="mb-3 detail-text">Sph Report</p>
                            <div className="upper-wrap mb-3">
                                <p className="mb-0"><b>Left</b></p>
                                <p className="mb-0"><b className="d-block text-end">Right</b></p>
                            </div>
                            <div className="upper-wrap">
                        <p className="mb-0">{ReportData && ReportData.sph.left !== null ? ReportData.sph.left : "N/A"}</p>
                        <p className="mb-0 text-end">{ReportData && ReportData.sph.right !== null ? ReportData.sph.right : "N/A"}</p>
                        </div>
                        </div>
                        <div className="desc-laimer">
                            <h6>Disclaimer</h6>
                            <p className="mb-0">1. The results displayed are for reference purposes only.</p>
                            <p className="mb-0">
                                2. If you feel the power displayed is different than your old power,
                                then please speak with your eye doctor or call EyeMyEye and speak with the optometrist.
                            </p>
                            <p className="mb-0">
                                3. Without confirmation from your eye doctor or EyeMyEye optometrist,
                                do not use this power to make glasses. Share your Feedback.
                            </p>
                        </div>
                        <Form className="feedback-form mt-4" onFinish={onFinish} form={form}>
                        <div className='text-areawrap mb-3'>
                        <Form.Item
                            name="user_feedback"
                            label="Share Your Feedback"
                            className='feedack-formwrap'
                            rules={[
                              {
                                required: true,
                                message: 'Please share your feedback!',
                              },
                            ]}
                          >
                            <Input.TextArea rows={5} />
                          </Form.Item>

                        </div>
                         
                          <Form.Item>
                            <Button type="primary" htmlType="submit" className="submitwrap-btn">
                              Submit
                            </Button>
                          </Form.Item>
                      </Form>
                    </div>
                </div>
                 )}
            </div>
        </section>
  );
};

export default ReportSection;
